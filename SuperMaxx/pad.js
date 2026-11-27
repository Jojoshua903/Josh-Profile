import { kb, PAD, setPadLabels, padGlyph } from './keys.js?v=20261128w';
import { cfg } from './settings.js?v=20261128w';

// Controller support for any pad the browser reports (Xbox, PlayStation, Switch Pro and most
// others use the "standard" button order). In a match the buttons press the same keys the
// keyboard would, so every action behaves exactly the same; the sticks and triggers are read
// directly for moving, aiming, firing and zoom. Outside a match the pad drives a focus ring over
// whatever can be clicked on screen, with an on-screen keyboard for text boxes.
// The game switches to controller mode on the first button press and back on any real key or
// mouse move, so you can swap between the two at any time.

const BTN = { a: 0, b: 1, x: 2, y: 3, lb: 4, rb: 5, lt: 6, rt: 7, back: 8, start: 9, ls: 10, rs: 11, up: 12, down: 13, left: 14, right: 15 };
const DEAD = 0.16, TRIG = 0.3;
export const pad = { on: false, mode: false, kind: 'xbox', name: '', lx: 0, ly: 0, rx: 0, ry: 0, lt: 0, rt: 0, fire: false, zoom: false, sprint: false, gp: null };
export const padMode = () => pad.mode;
let now = {}, prev = {}, hooks = {};
const pressed = b => now[b] && !prev[b];

export function initPad(h) {
  hooks = h;
  // a real key, click or mouse move hands control back to the keyboard and mouse
  addEventListener('keydown', e => { if (e.isTrusted && pad.mode) setMode(false); }, true);
  addEventListener('mousedown', e => { if (e.isTrusted && pad.mode) setMode(false); }, true);
  let mx = 0;
  addEventListener('mousemove', e => {
    if (!pad.mode || !e.isTrusted) return;
    if ((mx += Math.abs(e.movementX) + Math.abs(e.movementY)) > 24) { mx = 0; setMode(false); }
  }, true);
  addEventListener('gamepadconnected', e => hooks.onConnect?.(e.gamepad, true));
  addEventListener('gamepaddisconnected', e => { hooks.onConnect?.(e.gamepad, false); if (pad.mode) releaseAll(); });
}

function setMode(on) {
  if (pad.mode === on) return;
  pad.mode = on;
  document.body.classList.toggle('pad-mode', on);
  setPadLabels(on, pad.kind);
  if (!on) { releaseAll(); setCur(null); closeKb(false); }
  swapKbd();
  hooks.onMode?.(on);
}

const kindOf = id => {
  const s = id.toLowerCase();
  if (/054c|dualsense|dualshock|playstation|wireless controller/.test(s)) return 'ps';
  if (/057e|pro controller|nintendo|joy-con/.test(s)) return 'switch';
  return 'xbox';
};
function stick(x, y) {
  const m = Math.hypot(x, y); if (m < DEAD) return [0, 0];
  const k = Math.min(1, (m - DEAD) / (1 - DEAD)) / m;
  return [x * k, y * k];
}

let swapT = 0;
export function padFrame(dt) {
  const list = navigator.getGamepads?.() || [];
  let gp = null;
  for (const g of list) if (g && g.connected && (!gp || g.timestamp > gp.timestamp)) gp = g;     // the pad used most recently
  prev = now; now = {};
  pad.on = !!gp; pad.gp = gp;
  if (!gp) { pad.lx = pad.ly = pad.rx = pad.ry = pad.lt = pad.rt = 0; if (pad.mode) releaseAll(); return; }
  if (pad.name !== gp.id) { pad.name = gp.id; pad.kind = kindOf(gp.id); setPadLabels(pad.mode, pad.kind); if (pad.mode) swapKbd(); }
  for (const k in BTN) { const b = gp.buttons[BTN[k]]; now[k] = !!b && (k === 'lt' || k === 'rt' ? b.value > TRIG || (b.pressed && b.value === 0) : b.pressed); }
  [pad.lx, pad.ly] = stick(gp.axes[0] || 0, gp.axes[1] || 0);
  [pad.rx, pad.ry] = stick(gp.axes[2] || 0, gp.axes[3] || 0);
  pad.lt = gp.buttons[6]?.value || (now.lt ? 1 : 0); pad.rt = gp.buttons[7]?.value || (now.rt ? 1 : 0);
  if (!pad.mode && (Object.keys(BTN).some(pressed) || Math.hypot(pad.lx, pad.ly) > 0.5 || Math.hypot(pad.rx, pad.ry) > 0.5)) setMode(true);
  if (!pad.mode) return;
  if ((swapT -= dt) <= 0) { swapT = 0.4; swapKbd(); }
  if (hooks.playing?.()) { if (cur) setCur(null); play(); }
  else { releaseAll(); ui(dt); }
}

// ---------- in a match ----------
// [button, action]: the button presses that action's key, so rebinds and every key handler just work
const MATCH = [['a', 'jump'], ['x', 'reload'], ['y', 'ult'], ['b', 'emote'], ['lb', 'q'], ['rb', 'ability'], ['up', 'spray'], ['back', 'board']];
const held = new Set();
function play() {
  for (const [b, act] of MATCH) {
    if (pressed(b)) press(kb(act));
    else if (!now[b] && prev[b]) lift(kb(act));
  }
  if (pressed('start')) hooks.pause?.();
  if (pressed('ls')) pad.sprint = !pad.sprint;                // click the left stick to sprint; it stops when you do
  if (Math.hypot(pad.lx, pad.ly) < 0.25) pad.sprint = false;
  pad.fire = now.rt; pad.zoom = now.lt;
}
const keyName = code => code === 'Space' ? ' ' : code.startsWith('Key') ? code.slice(3).toLowerCase() : code.startsWith('Digit') ? code.slice(5) : code;
function send(type, code, target = window) { target.dispatchEvent(new KeyboardEvent(type, { code, key: keyName(code), bubbles: true, cancelable: true })); }
function press(code) { if (!code || held.has(code)) return; held.add(code); send('keydown', code); }
function lift(code) { if (!held.delete(code)) return; send('keyup', code); }
function releaseAll() { for (const c of [...held]) lift(c); pad.fire = pad.zoom = pad.sprint = false; }
const tap = code => { const t = document.activeElement && document.activeElement !== document.body ? document.activeElement : document.body; send('keydown', code, t); send('keyup', code, t); };

export function rumble(strong, weak = strong, ms = 120) {
  if (!pad.mode || cfg.padRumble === false) return;
  try { pad.gp?.vibrationActuator?.playEffect?.('dual-rumble', { duration: ms, strongMagnitude: Math.min(1, strong), weakMagnitude: Math.min(1, weak) })?.catch?.(() => {}); } catch {}
}

// ---------- menus: a focus ring that moves between anything clickable ----------
const CLICK = 'button, a[href], input:not([type=hidden]), select, textarea, [tabindex]:not([tabindex="-1"]), [role=button], [data-act], [data-h], [data-hero], [data-map], [data-equip], [data-skin], [data-tab], [data-play], [data-pair], [data-f], [data-stab], [data-how], [data-howto], [data-back], [data-k], .tile, .stg-card, .sk';
const LOOSE = 'div, li, span, label, img, article, section, figure';
let cur = null, lastRect = null, rep = { dir: null, t: 0 }, cache = { t: 0, list: [] }, clock = 0, checkT = 0, scrollAcc = [0, 0];

const shown = el => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2; };
// is this element on the top layer (not under a menu, sheet or overlay)? Elements scrolled out of
// a list count if the list itself is on top, so the ring can scroll down to them.
function reachable(el) {
  const r = el.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  if (x >= 0 && y >= 0 && x < innerWidth && y < innerHeight) {
    const hit = document.elementFromPoint(x, y);
    if (hit && (el === hit || el.contains(hit) || hit.contains(el) && !hit.matches(CLICK))) return true;
  }
  const sc = scroller(el); if (!sc) return false;
  const s = sc.getBoundingClientRect(), L = Math.max(0, s.left), T = Math.max(0, s.top), R = Math.min(innerWidth, s.right), B = Math.min(innerHeight, s.bottom);
  if (R - L < 4 || B - T < 4) return false;
  const out = x < s.left || x > s.right || y < s.top || y > s.bottom || x < 0 || y < 0 || x > innerWidth || y > innerHeight;
  if (!out) return false;                              // in view but covered by something else
  const hit = document.elementFromPoint((L + R) / 2, (T + B) / 2);
  return !!hit && sc.contains(hit);
}
function scroller(el) {
  for (let p = el?.parentElement; p && p !== document.body; p = p.parentElement) {
    if (p.scrollHeight > p.clientHeight + 2 || p.scrollWidth > p.clientWidth + 2) {
      const s = getComputedStyle(p);
      if (/(auto|scroll)/.test(s.overflowY + s.overflowX)) return p;
    }
  }
  return null;
}
function candidates() {
  if (clock - cache.t < 0.25) return cache.list.filter(e => e.isConnected);
  const out = new Set();
  for (const el of document.querySelectorAll(CLICK)) if (!el.disabled && el.closest('[inert],[aria-hidden="true"]') === null && shown(el)) out.add(el);
  // clickable cards the selector can't know about: anything showing a hand cursor
  for (const el of document.querySelectorAll(LOOSE)) {
    if (out.has(el) || !el.parentElement || !shown(el)) continue;
    if (getComputedStyle(el).cursor === 'pointer' && getComputedStyle(el.parentElement).cursor !== 'pointer') out.add(el);
  }
  const list = [...out].filter(el => {
    if (el.closest('button, a[href]') !== el && el.parentElement?.closest('button, a[href], [data-k]')) return false;   // the inside of a button
    const s = getComputedStyle(el);
    return s.visibility !== 'hidden' && +s.opacity > 0.05 && s.pointerEvents !== 'none' && reachable(el);
  });
  cache = { t: clock, list };
  return list;
}
const mid = r => [r.left + r.width / 2, r.top + r.height / 2];
function pickNear(rect, list) {
  const [x, y] = rect ? mid(rect) : [innerWidth / 2, innerHeight / 2];
  let best = null, bd = Infinity;
  for (const el of list) { const [ex, ey] = mid(el.getBoundingClientRect()), d = Math.hypot(ex - x, ey - y); if (d < bd) { bd = d; best = el; } }
  return best;
}
// a sensible first stop on a new screen: its main button if it has one
const PRIMARY = '.bigbtn, .sty-go, #lockIn, #stgGo, #again, #resume, .mv-go, .pc-skip, [data-k="Q"], button.go, button.primary';
function firstPick(list) { return list.find(el => el.matches(PRIMARY)) || pickNear(null, list); }

const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
function move(d) {
  const list = candidates();
  if (!cur) { setCur(firstPick(list)); return; }
  const a = cur.getBoundingClientRect(), [dx, dy] = DIRS[d], [ax, ay] = mid(a);
  let best = null, bs = Infinity;
  for (const el of list) {
    if (el === cur || cur.contains(el) || el.contains(cur)) continue;
    const b = el.getBoundingClientRect(), [bx, by] = mid(b);
    const along = (bx - ax) * dx + (by - ay) * dy;
    if (along <= 2) continue;
    // gap to its near edge, and how far off to the side it sits (zero if the two line up)
    const gap = dx ? (dx > 0 ? b.left - a.right : a.left - b.right) : (dy > 0 ? b.top - a.bottom : a.top - b.bottom);
    const over = dx ? Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) : Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const side = over > 0 ? 0 : Math.abs(dx ? by - ay : bx - ax);
    const s = Math.max(0, gap) + side * 2.5 + (over > 0 ? 0 : 40) + (gap < -4 ? along * 0.5 : 0);
    if (s < bs) { bs = s; best = el; }
  }
  if (best) setCur(best, true);
}
function setCur(el, sound) {
  if (cur === el) return;
  cur?.classList.remove('pad-focus');
  cur = el;
  if (!el) return;
  el.classList.add('pad-focus');
  lastRect = el.getBoundingClientRect();
  el.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));     // hover previews (stages, tooltips)
  el.dispatchEvent(new MouseEvent('mouseenter'));
  if (sound) hooks.blip?.(520);
}

function ui(dt) {
  clock += dt;
  // keep the ring on something real: re-rendered, scrolled away, or the screen changed under it
  const stale = !cur || !cur.isConnected || !shown(cur) || (clock - checkT > 0.8 && (checkT = clock, !candidates().includes(cur)));
  if (stale) {
    // something in the same spot (the button was just redrawn) keeps the ring; otherwise start at the new screen's main button
    const list = candidates(), near = cur && lastRect && pickNear(lastRect, list);
    const same = near && Math.hypot(...mid(near.getBoundingClientRect()).map((v, i) => v - mid(lastRect)[i])) < 60;
    setCur(list.length ? (same || (cur && cur.isConnected && shown(cur)) ? near : firstPick(list)) : null);
  }
  if (cur) lastRect = cur.getBoundingClientRect();
  const d = dirInput(dt);
  if (d && !adjust(d)) move(d);
  if (kbd) {                                            // the on-screen keyboard has its own shortcuts
    if (pressed('b')) kbKey('back', true);
    if (pressed('y')) kbKey(' ');
    if (pressed('x')) kbKey('shift');
    if (pressed('start')) kbKey('done');
    if (pressed('a')) activate();
    return;
  }
  if (pressed('a')) activate();
  if (pressed('b')) back();
  if (pressed('lb')) tabs(-1);
  if (pressed('rb')) tabs(1);
  if (pressed('lt')) { tap('ArrowLeft'); tap('ArrowUp'); }         // step through heroes, stages and chapters
  if (pressed('rt')) { tap('ArrowRight'); tap('ArrowDown'); }
  if (pressed('start') && !hooks.start?.()) [...document.querySelectorAll('[data-open-settings]')].find(el => shown(el) && reachable(el))?.click();
  // the right stick scrolls whatever list the ring is in
  if (pad.rx || pad.ry) {
    const sc = scroller(cur) || document.scrollingElement;
    scrollAcc[0] += pad.rx * 900 * dt; scrollAcc[1] += pad.ry * 900 * dt;
    const sx = Math.trunc(scrollAcc[0]), sy = Math.trunc(scrollAcc[1]);
    if (sx || sy) { sc.scrollBy(sx, sy); scrollAcc[0] -= sx; scrollAcc[1] -= sy; cache.t = -1; }
  }
}
function dirInput(dt) {
  let d = now.up ? 'up' : now.down ? 'down' : now.left ? 'left' : now.right ? 'right' : null;
  if (!d && Math.hypot(pad.lx, pad.ly) > 0.55) d = Math.abs(pad.lx) > Math.abs(pad.ly) ? (pad.lx > 0 ? 'right' : 'left') : (pad.ly > 0 ? 'down' : 'up');
  if (!d) { rep.dir = null; return null; }
  if (d !== rep.dir) { rep.dir = d; rep.t = 0.36; return d; }
  if ((rep.t -= dt) <= 0) { rep.t = 0.1; return d; }
  return null;
}
// left and right nudge a slider or a dropdown instead of moving off it
function adjust(d) {
  if (!cur || (d !== 'left' && d !== 'right')) return false;
  const s = d === 'right' ? 1 : -1;
  if (cur.matches('input[type=range]')) {
    const st = +cur.step || 1, v = Math.min(+cur.max, Math.max(+cur.min, +cur.value + s * st));
    if (v !== +cur.value) { cur.value = v; cur.dispatchEvent(new Event('input', { bubbles: true })); cur.dispatchEvent(new Event('change', { bubbles: true })); hooks.blip?.(600 + s * 60); }
    return true;
  }
  if (cur.matches('select')) {
    const i = Math.min(cur.options.length - 1, Math.max(0, cur.selectedIndex + s));
    if (i !== cur.selectedIndex) { cur.selectedIndex = i; cur.dispatchEvent(new Event('change', { bubbles: true })); hooks.blip?.(640); }
    return true;
  }
  return false;
}
function activate() {
  if (!cur) { tap(hooks.inMatch?.() ? 'Space' : 'Enter'); return; }
  if (cur.matches('input[type=range]')) return;
  if (cur.matches('select')) { cur.selectedIndex = (cur.selectedIndex + 1) % cur.options.length; cur.dispatchEvent(new Event('change', { bubbles: true })); return; }
  if (cur.matches('textarea, input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit])')) { openKb(cur); return; }
  cur.click();
  cache.t = -1; checkT = -9;
}
const BACK = '[data-back], #onBack, #setX, .sh-x, [data-ht-close], [aria-label^="Close"], [aria-label^="close"]';
function back() {
  if (hooks.back?.()) return;
  const list = candidates();
  const b = list.find(el => el.matches(BACK)) || list.find(el => el.matches('button') && /^\s*(◂|←|✕|×|back\b|close\b|cancel\b)/i.test(el.textContent));
  if (b) { b.click(); cache.t = -1; return; }
  tap('Escape');
}
// LB / RB: switch tabs. Looks for a row of buttons with one marked as selected, highest on screen first.
function tabs(dir) {
  const list = candidates(), groups = new Map();
  for (const el of list) { const p = el.parentElement; if (!groups.has(p)) groups.set(p, []); groups.get(p).push(el); }
  let best = null;
  for (const [p, els] of groups) {
    if (els.length < 2) continue;
    const on = els.findIndex(e => e.classList.contains('on') || e.classList.contains('active') || e.getAttribute('aria-selected') === 'true');
    if (on < 0) continue;
    const s = p.getBoundingClientRect().top - els.length * 6;
    if (!best || s < best.s) best = { els, on, s };
  }
  if (!best) { tap(dir < 0 ? 'ArrowLeft' : 'ArrowRight'); return; }
  const n = best.els[(best.on + dir + best.els.length) % best.els.length];
  const had = best.els.includes(cur);
  n.click(); cache.t = -1;
  if (had) setCur(n);
}

// ---------- on-screen keyboard for text boxes ----------
const ROWS = ['1234567890', 'QWERTYUIOP', 'ASDFGHJKL-', 'ZXCVBNM_.!'];
let kbd = null;
function openKb(input) {
  closeKb(false);
  const el = document.createElement('div');
  el.id = 'padKb';
  const label = input.getAttribute('aria-label') || input.placeholder || 'Type';
  el.innerHTML = `<div class="pk-sheet"><div class="pk-top"><small></small><div class="pk-val"></div></div>
    ${ROWS.map(r => `<div class="pk-row">${[...r].map(c => `<button data-k="${c}">${c}</button>`).join('')}</div>`).join('')}
    <div class="pk-row"><button data-k="shift" class="wide">⇧ Shift</button><button data-k=" " class="space">Space</button><button data-k="back" class="wide">⌫</button><button data-k="done" class="wide go">Done ✓</button></div>
    <p class="pk-hint"><kbd>${padGlyph('b')}</kbd> delete <kbd>${padGlyph('y')}</kbd> space <kbd>${padGlyph('x')}</kbd> shift <kbd>${padGlyph('start')}</kbd> done</p></div>`;
  el.querySelector('.pk-top small').textContent = label;
  document.body.appendChild(el);
  const upper = !input.value || /code/i.test(input.id + input.name) || getComputedStyle(input).textTransform === 'uppercase';
  kbd = { el, input, upper };
  el.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) kbKey(b.dataset.k); else if (e.target === el) closeKb(false); });
  kbShow(); cache.t = -1;
  setCur(el.querySelector('[data-k="Q"]'));
}
function kbShow() {
  const { el, input, upper } = kbd;
  el.querySelector('.pk-val').textContent = input.value || ' ';
  for (const b of el.querySelectorAll('.pk-row button[data-k]')) if (b.dataset.k.length === 1 && /[A-Z]/i.test(b.dataset.k)) b.textContent = upper ? b.dataset.k : b.dataset.k.toLowerCase();
  el.querySelector('[data-k="shift"]').classList.toggle('on', upper);
}
function kbKey(k, fromB) {
  if (!kbd) return;
  const { input } = kbd;
  if (k === 'done') return closeKb(true);
  if (k === 'shift') { kbd.upper = !kbd.upper; kbShow(); return; }
  if (k === 'back') { if (!input.value && fromB) return closeKb(false); input.value = input.value.slice(0, -1); }
  else {
    const max = input.maxLength > 0 ? input.maxLength : 200;
    if (input.value.length >= max) { hooks.blip?.(160); return; }
    input.value += /[a-z]/i.test(k) ? (kbd.upper ? k.toUpperCase() : k.toLowerCase()) : k;
    if (kbd.upper && input.value.length === 1 && !/code/i.test(input.id)) kbd.upper = false;      // a capital to start, then lower case
  }
  input.dispatchEvent(new Event('input', { bubbles: true }));
  hooks.blip?.(700);
  kbShow();
}
function closeKb(submit) {
  if (!kbd) return;
  const { el, input } = kbd; kbd = null;
  el.remove(); cache.t = -1;
  if (!input.isConnected) return;
  setCur(input);
  input.dispatchEvent(new Event('change', { bubbles: true }));
  if (submit) { send('keydown', 'Enter', input); send('keyup', 'Enter', input); }
}

// ---------- key hints: show the pad's buttons instead of keys while you're on a controller ----------
const HINT = { Esc: 'b', Space: 'a', Enter: 'a', Tab: 'back', Shift: 'ls', 'L-Shift': 'ls', 'Left click': 'rt', 'Right click': 'lt', Q: 'lb', E: 'rb', F: 'y', R: 'x', T: 'up' };
function swapKbd() {
  for (const k of document.querySelectorAll('kbd')) {
    if (k.closest('#setGrid, #padKb, .hx-key')) continue;
    if (pad.mode) {
      if (k.dataset.padk != null) continue;
      const t = k.textContent.trim();
      // WASD shown as four keys becomes one "left stick"
      if (t === 'W' && k.nextElementSibling?.matches('kbd') && k.nextElementSibling.textContent.trim() === 'A') {
        k.dataset.padk = t; k.textContent = 'Left stick';
        for (let n = k.nextElementSibling, i = 0; n && i < 3 && n.matches('kbd'); n = n.nextElementSibling, i++) { n.dataset.padk = n.textContent; n.dataset.padhide = '1'; n.style.display = 'none'; }
        continue;
      }
      const g = t === 'Mouse' ? 'Right stick' : HINT[t] ? padGlyph(HINT[t]) : null;
      if (g) { k.dataset.padk = t; k.textContent = g; }
    } else if (k.dataset.padk != null) {
      k.textContent = k.dataset.padk; if (k.dataset.padhide) { k.style.display = ''; delete k.dataset.padhide; }
      delete k.dataset.padk;
    }
  }
}

// the button layout, for the settings page
export const PAD_LAYOUT = [
  ['Left stick', 'Move'], ['Right stick', 'Aim and look'], ['rt', 'Fire'], ['lt', 'Zoom (hold)'], ['a', 'Jump'], ['ls', 'Sprint (click)'],
  [PAD.q, 'Ability 1'], [PAD.ability, 'Ability 2'], [PAD.ult, 'Ultimate'], [PAD.reload, 'Reload'], [PAD.emote, 'Emote wheel (hold, aim with the right stick)'],
  [PAD.spray, 'Spray'], [PAD.board, 'Scoreboard (hold)'], ['start', 'Pause'],
];
export const PAD_MENU = [['Left stick / D-pad', 'Move between buttons'], ['a', 'Select'], ['b', 'Back'], ['lb', 'Previous tab'], ['rb', 'Next tab'], ['lt', 'Previous hero or stage'], ['rt', 'Next hero or stage'], ['Right stick', 'Scroll'], ['start', 'Settings']];
export const padLabel = b => (BTN[b] != null ? padGlyph(b) : b);
