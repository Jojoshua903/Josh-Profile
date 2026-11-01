import { sfx } from './core.js';

// Radio channel: Reshman (handler, loyalty unclear), Daniel, and the base PA.
const svg = s => `<svg viewBox="0 0 64 64">${s}</svg>`;
const SPEAKERS = {
  RESHMAN: {
    name: 'RESHMAN', role: 'ENCRYPTED CHANNEL · FRIENDLY?', cls: 'resh',
    face: svg(`<rect width="64" height="64" fill="#e8dcc0"/><path d="M8 64 C8 30 18 10 32 10 C46 10 56 30 56 64Z" fill="#1d1b16"/>
      <rect x="15" y="26" width="34" height="9" rx="4" fill="#c99a6e"/><path d="M19 30 l8 -2 l1 3 l-8 1z M45 30 l-8 -2 l-1 3 l8 1z" fill="#1d1b16"/>
      <rect x="12" y="20" width="40" height="5" fill="#d2391b"/><path d="M50 21 l12 -6 l-2 6 l2 5z" fill="#d2391b"/><path d="M14 42 h36" stroke="#3a3a35" stroke-width="2"/>`),
  },
  DANIEL: {
    name: 'DANIEL', role: 'DEMOLITIONS SPECIALIST', cls: 'dan',
    face: svg(`<rect width="64" height="64" fill="#efe4cc"/><path d="M10 64 C10 46 20 40 32 40 C44 40 54 46 54 64Z" fill="#5b5f3a"/>
      <rect x="18" y="16" width="28" height="30" rx="10" fill="#c99a6e"/><path d="M14 22 C14 8 50 8 50 22 L50 24 L14 24Z" fill="#5b5f3a"/>
      <rect x="18" y="25" width="28" height="8" rx="3" fill="#1d1b16"/><rect x="21" y="27" width="9" height="4" fill="#f2b51c"/><rect x="34" y="27" width="9" height="4" fill="#f2b51c"/>
      <path d="M22 40 Q32 46 42 40" stroke="#8a6a42" stroke-width="3" fill="none"/>`),
  },
  PA: {
    name: 'IRONVEIL PA', role: 'BASE ANNOUNCEMENT', cls: 'pa',
    face: svg(`<rect width="64" height="64" fill="#9e2b25"/><path d="M14 26 h10 l14 -10 v32 l-14 -10 h-10z" fill="#f7f0e1"/><path d="M44 22 q6 10 0 20 M49 17 q10 15 0 30" stroke="#f7f0e1" stroke-width="3" fill="none"/>`),
  },
  CAPTION: { name: '', role: '', cls: 'cap', face: '' },
  VAULT: {
    name: 'THE VAULT', role: '?? · NOT A RADIO SIGNAL', cls: 'vault',
    face: svg(`<rect width="64" height="64" fill="#e9f3f1"/><circle cx="32" cy="32" r="24" fill="none" stroke="#2a9d9a" stroke-width="2"/>
      <path d="M8 32 Q32 12 56 32 Q32 52 8 32Z" fill="#f7f0e1" stroke="#2a9d9a" stroke-width="2.5"/><circle cx="32" cy="32" r="8" fill="#2a9d9a"/><circle cx="32" cy="32" r="3" fill="#f2b51c"/>
      <path d="M32 4 v6 M32 54 v6 M4 32 h6 M54 32 h6" stroke="#2a9d9a" stroke-width="2"/>`),
  },
  RESH_TRUE: {
    name: 'RESHMAN', role: 'NOT ON YOUR RADIO', cls: 'true',
    face: svg(`<rect width="64" height="64" fill="#1d1b16"/><path d="M8 64 C8 30 18 10 32 10 C46 10 56 30 56 64Z" fill="#2a2a28"/>
      <rect x="15" y="26" width="34" height="9" rx="4" fill="#1d1b16"/><circle cx="24" cy="30.5" r="2.6" fill="#f2b51c"/><circle cx="40" cy="30.5" r="2.6" fill="#f2b51c"/>
      <rect x="12" y="20" width="40" height="5" fill="#d2391b"/><path d="M50 21 l12 -6 l-2 6 l2 5z" fill="#d2391b"/>`),
  },
};
SPEAKERS.RESH_GLITCH = { ...SPEAKERS.RESHMAN, name: 'R̷ESHM̴AN', role: 'SIGNAL DEGRADED · FRIENDLY??', cls: 'resh glitch' };
SPEAKERS.MIRA = {
  name: 'MIRA', role: 'WATCH SIGNALS CORPS · DEFECTED', cls: 'mira',
  face: svg(`<rect width="64" height="64" fill="#eaf1f4"/><path d="M8 64 C8 44 18 38 32 38 C46 38 56 44 56 64Z" fill="#9e2b25"/>
    <path d="M24 38 L32 50 L40 38Z" fill="#f7f0e1"/><rect x="20" y="14" width="24" height="28" rx="10" fill="#b98a62"/>
    <path d="M17 26 C15 8 49 6 47 26 C46 18 40 15 32 15 C24 15 19 18 17 26Z" fill="#1d1b16"/><path d="M17 26 L15 40 L20 36Z" fill="#1d1b16"/>
    <rect x="24" y="26" width="5" height="3" fill="#1d1b16"/><rect x="35" y="26" width="5" height="3" fill="#1d1b16"/><path d="M27 36 h10" stroke="#7a4a32" stroke-width="2"/>
    <path d="M14 28 Q12 16 22 10" stroke="#3a3a35" stroke-width="3" fill="none"/><rect x="11" y="27" width="6" height="9" rx="2" fill="#3a3a35"/><path d="M15 36 Q18 42 26 41" stroke="#3a3a35" stroke-width="2" fill="none"/>`),
};
SPEAKERS.MIRA_TRUE = { ...SPEAKERS.MIRA, role: 'ORDER OF QUIET SAND · THE ONE BLADE', cls: 'mira true' };
SPEAKERS.ABBESS = {
  name: 'ABBESS TENET', role: 'ORDER OF QUIET SAND', cls: 'abbess',
  face: svg(`<rect width="64" height="64" fill="#f6e7d2"/><path d="M6 64 C6 30 18 8 32 8 C46 8 58 30 58 64Z" fill="#f4ece0" stroke="#d8c8b0" stroke-width="2"/>
    <ellipse cx="32" cy="32" rx="12" ry="15" fill="#a8774f"/><path d="M24 28 h6 M34 28 h6" stroke="#1d1b16" stroke-width="2.5"/><path d="M27 41 q5 3 10 0" stroke="#6b4228" stroke-width="2" fill="none"/>
    <path d="M32 18 v6 M28 21 h8" stroke="#2f9c95" stroke-width="2"/><path d="M20 30 q-3 8 2 14 M44 30 q3 8 -2 14" stroke="#e0d2bc" stroke-width="1.5" fill="none"/>
    <path d="M14 58 L50 58" stroke="#2f9c95" stroke-width="5"/>`),
};
SPEAKERS.UNENDING = {
  name: 'THE UNENDING', role: 'MANY VOICES · ONE SONG', cls: 'vault',
  face: svg(`<rect width="64" height="64" fill="#e4f2ef"/>${[[14, 1], [32, 0], [50, 1]].map(([x, d]) => `<path d="M${x - 9} 58 C${x - 9} 40 ${x - 5} ${30 + d * 6} ${x} ${30 + d * 6} C${x + 5} ${30 + d * 6} ${x + 9} 40 ${x + 9} 58Z" fill="#cdf1f6" stroke="#3f7f9a" stroke-width="1.5"/><circle cx="${x}" cy="${24 + d * 6}" r="7" fill="#cdf1f6" stroke="#3f7f9a" stroke-width="1.5"/><path d="M${x - 3} ${23 + d * 6} h2 M${x + 1} ${23 + d * 6} h2" stroke="#1f5f73" stroke-width="1.5"/>`).join('')}`),
};
SPEAKERS.DEEP = {
  name: 'THE DEEP CHOIR', role: 'THE FIRST SINGER · FROM THE WATER', cls: 'deep',
  face: svg(`<rect width="64" height="64" fill="#dff1ef"/><path d="M0 40 Q16 32 32 40 T64 40 V64 H0Z" fill="#1f6f78"/><path d="M0 48 Q16 42 32 48 T64 48" stroke="#9feef4" stroke-width="2" fill="none"/>
    <path d="M32 8 L42 30 L32 38 L22 30Z" fill="#d6f3f8" stroke="#1f6f78" stroke-width="2"/><path d="M18 16 L24 32 M46 16 L40 32" stroke="#1f6f78" stroke-width="2"/><circle cx="32" cy="27" r="3.5" fill="#f2b51c"/>`),
};
SPEAKERS.LETTER = {
  name: 'A LETTER', role: 'NEVER DELIVERED', cls: 'letter',
  face: svg(`<rect width="64" height="64" fill="#f4efe3"/><rect x="12" y="16" width="40" height="32" fill="#fffaf0" stroke="#8a6a42" stroke-width="2"/><path d="M12 16 L32 34 L52 16" stroke="#8a6a42" stroke-width="2" fill="none"/>
    <circle cx="32" cy="40" r="5" fill="#c8321e"/><path d="M8 54 Q20 50 32 54 T56 54" stroke="#1f6f78" stroke-width="2" fill="none"/>`),
};
SPEAKERS.ELDER = { ...SPEAKERS.ABBESS, name: 'MASTER ILKA', role: 'ORDER OF QUIET SAND · 1,004 YEARS AGO' };
SPEAKERS.YOUNG_RESH = { ...SPEAKERS.RESHMAN, role: 'AGE SIXTEEN · NOT YET A BLADE' };
SPEAKERS.PRISONER = {
  name: 'PRISONER', role: 'SALTCROWN CELL BLOCK', cls: 'pa',
  face: svg(`<rect width="64" height="64" fill="#e2dad2"/><path d="M10 64 C10 46 20 40 32 40 C44 40 54 46 54 64Z" fill="#b7aa92"/><rect x="20" y="14" width="24" height="28" rx="9" fill="#c99a6e"/>
    <rect x="25" y="25" width="4" height="3" fill="#1d1b16"/><rect x="35" y="25" width="4" height="3" fill="#1d1b16"/><path d="M27 36 h10" stroke="#7a4a32" stroke-width="2"/>
    <rect x="44" y="40" width="10" height="24" fill="#cdf1f6" stroke="#3f7f9a" stroke-width="1.5"/>${[8, 20, 32, 44, 56].map(x => `<rect x="${x}" y="0" width="3" height="64" fill="#55574f"/>`).join('')}`),
};
SPEAKERS.SAND = {
  name: 'THE SAND', role: 'IN YOUR BONES', cls: 'sand',
  face: svg(`<rect width="64" height="64" fill="#f3e2b0"/><path d="M0 44 Q16 34 32 44 T64 44 V64 H0Z" fill="#d9b45a"/><path d="M0 52 Q16 44 32 52 T64 52" stroke="#b8860b" stroke-width="2" fill="none"/>
    <path d="M18 28 L22 14 L28 24 L32 10 L36 24 L42 14 L46 28Z" fill="#b8860b"/><circle cx="25" cy="34" r="2.5" fill="#1d1b16"/><circle cx="39" cy="34" r="2.5" fill="#1d1b16"/>`),
};

// sprinkle a few corrupted characters into glitchy lines
const GL = '▓▒░#%&§¿';
function corrupt(s) { return s.replace(/[a-z]/gi, ch => Math.random() < .06 ? GL[Math.floor(Math.random() * GL.length)] : ch); }

const el = document.getElementById('comms');
const faceEl = el.querySelector('.face'), whoEl = el.querySelector('.who'), roleEl = el.querySelector('.role'), txtEl = el.querySelector('.txt');

export const Comms = {
  queue: [], cur: null, said: new Set(), gap: 0,
  say(who, text, dur) { this.queue.push({ who, text, dur }); },
  once(key, lines) { if (this.said.has(key)) return false; this.said.add(key); lines.forEach(([w, t, d]) => this.say(w, t, d)); return true; },
  idle() { return !this.cur && !this.queue.length; },
  clear() { this.queue = []; this.cur = null; el.classList.remove('show'); },
  reset() { this.clear(); this.said = new Set(); },
  advance() { if (!this.cur) return; if (this.cur.shown < this.cur.text.length) this.cur.shown = this.cur.text.length; else this.cur.t = this.cur.dur; },
  update(dt) {
    if (!this.cur) {
      if (this.gap > 0) { this.gap -= dt; return; }
      const n = this.queue.shift(); if (!n) { el.classList.remove('show'); return; }
      const sp = SPEAKERS[n.who];
      this.cur = { ...n, text: n.who === 'RESH_GLITCH' ? corrupt(n.text) : n.text, t: 0, shown: 0, dur: n.dur || 1.8 + n.text.length * .055 };
      el.className = 'show ' + sp.cls; faceEl.innerHTML = sp.face; whoEl.textContent = sp.name; roleEl.textContent = sp.role;
      if (n.who === 'VAULT' || n.who === 'RESH_TRUE' || n.who === 'SAND' || n.who === 'UNENDING' || n.who === 'DEEP') sfx.whisper(); else if (n.who !== 'CAPTION') sfx.radio();
    }
    const c = this.cur; c.t += dt;
    const prev = Math.floor(c.shown); c.shown = Math.min(c.text.length, c.shown + dt * 48);
    if (Math.floor(c.shown) > prev && prev % 3 === 0 && c.who !== 'CAPTION' && c.who !== 'VAULT' && c.who !== 'SAND' && c.who !== 'DEEP') sfx.blip(c.who.startsWith('RESH') ? 820 : c.who.startsWith('MIRA') ? 960 : c.who === 'PA' ? 420 : 600);
    txtEl.textContent = c.text.slice(0, Math.floor(c.shown));
    if (c.t >= c.dur) { this.cur = null; this.gap = .25; }
  },
};

export const PA_LINES = [
  'Shift two, report to the motor pool. Shift two, motor pool.',
  'Reminder: smoking near the fuel depot is punishable by exile.',
  'Unscheduled aircraft debris reported on the east roof. Remain calm.',
  'The Watch sees all. The Watch also needs someone to fix the generator. Again.',
  'Mess hall is serving lentils. Morale officers, please report to the mess hall.',
  'Any personnel who borrowed the comms array password, please return it.',
];

export const GUARD_BARKS = {
  alert: ['CONTACT!', 'INTRUDER!', 'THERE HE IS!', 'HEY! YOU!', 'OPEN FIRE!'],
  lost: ['WHERE DID HE GO?', 'LOST HIM...', 'CHECK THE CORNERS', 'STAY SHARP'],
};
