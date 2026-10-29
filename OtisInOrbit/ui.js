import { canvas } from './core.js?v=sub1';
import { LOOK_DEF, M } from './josh.js?v=sub1';

export const FEEL_DEF = { speed: 7, jump: 12, gravity: 30, air: 0.45, cam: 9 };
export const S = { ...FEEL_DEF };
export const LOOK = { ...LOOK_DEF };

const $ = (s) => document.querySelector(s);

// Keeps whatever look/feel was tuned in the earlier test builds.
function load() {
  try {
    const d = JSON.parse(localStorage.getItem('josh-test') || 'null');
    if (d) { Object.assign(LOOK, d.look); Object.assign(S, d.feel); }
    if (LOOK.droneName === 'Bleep') LOOK.droneName = 'Byte';
  } catch (e) {}
}

function applyLook(josh) {
  ['hoodie', 'pants', 'hair', 'skin', 'shoes', 'drone'].forEach((k) => M[k].color.set(LOOK[k]));
  Object.entries(josh.hair).forEach(([k, g]) => (g.visible = k === LOOK.hairStyle));
  josh.glasses.visible = LOOK.glasses;
  josh.phones.visible = LOOK.phones;
  josh.pack.visible = LOOK.pack;
}

export function initUI(josh) {
  load();
  applyLook(josh);
  $('#droneName').textContent = LOOK.droneName || 'Byte';
  canvas.focus();
  addEventListener('pointerdown', () => canvas.focus());
}

export function setAbility(ab, info) {
  const s = $('#slot1');
  s.classList.toggle('empty', !ab);
  s.style.setProperty('--c', ab ? info.color : 'transparent');
  $('#slot1Icon').textContent = ab ? info.icon : '';
  $('#slot1Name').textContent = ab ? info.label : 'Leeg';
}

let lastCoins = 0;
export function setCookies(coins, rare, total) {
  $('#rareN').textContent = rare;
  $('#rareT').textContent = total;
  $('#coinN').textContent = coins;
  if (coins !== lastCoins) {
    const el = $('#coins');
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    lastCoins = coins;
  }
}

export function setPrompt(text) {
  const p = $('#prompt');
  p.style.display = text ? 'block' : 'none';
  if (text) p.innerHTML = text;
}
