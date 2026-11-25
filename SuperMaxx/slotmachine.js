import { HEROES } from './heroes.js?v=20261126a';
import { cfg, save } from './settings.js?v=20261126a';
import { headshot } from './portraits.js?v=20261126a';
import { skinById, dressedAny, equip, cosById, equipCos } from './pass.js?v=20261126a';
import { sprayUrl } from './sprays.js?v=20261126a';
import { tokens, spin, prizes, spins } from './slots.js?v=20261126a';
import { initAudio, tone, noise } from './audio.js?v=20261126a';

// The slot machine screen: three reels, a lever and the prize board. Pull costs one mastery
// token; every pull lands three of a kind on something new, then shows what you won.

const $ = id => document.getElementById(id);
const hex = c => '#' + c.toString(16).padStart(6, '0');
const SYM = { slime: '🟢', brawler: '🥊', chipmunk: '🐿️', elf: '🏹', dancer: '🩰', mole: '🕳️', medic: '🩺', spark: '⚡', builder: '🧱', skin: '💎', spray: '🎨' };
const FILL = ['🍒', '⭐', '🔔', '🍋', '7️⃣', '🍀', '🥜'];
const ROW = 76, STRIP = 26;              // ROW matches .sl-strip i height in menu.css
let busy = false, wired = false;

const info = p => {
  if (p.kind === 'spray') { const c = cosById(p.id); return { img: sprayUrl(c), title: c.name, sub: 'Spray · press T in a match', color: c.b, sym: SYM.spray, cos: c }; }
  if (p.kind === 'hero') { const h = HEROES.find(x => x.id === p.id); return { def: h, title: h.callsign, sub: `New hero · ${h.role}`, color: h.color, sym: SYM[p.id] }; }
  const s = skinById(p.id), h = HEROES.find(x => x.id === s.hero);
  return { def: { ...dressedAny(h, s), skinName: s.name }, title: s.name, sub: `${h.callsign} skin`, color: s.color, sym: SYM.skin, hero: h, skin: s };
};

function board() {
  const list = prizes(), left = list.filter(p => !p.owned).length;
  $('slBoard').innerHTML = `<h4>Prize board <small>${list.length - left}/${list.length} won</small></h4>` + list.map(p => {
    const I = info(p);
    return `<div class="sl-pz ${p.owned ? 'won' : ''} ${p.kind}" style="--hc:${hex(I.color)}"><img alt="" data-pz="${p.id}"><span><b>${I.title}</b><small>${I.sub}</small></span>
      <em>${p.owned ? '✓ Won' : `${Math.round(p.odds * 100)}%`}</em></div>`;
  }).join('');
  $('slBoard').querySelectorAll('img[data-pz]').forEach((img, k) => setTimeout(() => {
    const p = list.find(x => x.id === img.dataset.pz); const I = info(p); img.src = I.img || headshot(I.def);
  }, 30 + k * 40));
  const t = tokens(), done = !left;
  $('slTok').textContent = t;
  $('slGo').disabled = busy || !t || done;
  $('slGo').querySelector('small').textContent = done ? 'Every prize won!' : t ? '1 mastery token' : 'No tokens yet';
  $('slHint').textContent = done ? 'You have cleaned out the machine. More prizes next season.'
    : t ? `${t} token${t > 1 ? 's' : ''} ready. Every pull wins something new.` : 'Rank a hero up in mastery (Bronze → Silver → Gold → Diamond) to earn a token. Maxed heroes keep earning one every 7,400 XP.';
}

function strip(reel, final) {
  const s = $('slReels').children[reel].firstElementChild;
  s.style.transition = 'none'; s.style.transform = 'translateY(0)';
  const syms = Array.from({ length: STRIP }, () => FILL[Math.floor(Math.random() * FILL.length)]);
  syms[STRIP - 2] = final;
  s.innerHTML = syms.map(x => `<i>${x}</i>`).join('');
  void s.offsetWidth;
  return s;
}

function pull() {
  if (busy) return;
  const p = spin();
  if (!p) { tone(160, 0.12, 'square', 0.05, 1); return; }
  busy = true; initAudio();
  const I = info(p);
  $('slWin').classList.add('hidden');
  $('slLever').classList.remove('pull'); void $('slLever').offsetWidth; $('slLever').classList.add('pull');
  $('slMachine').classList.add('spinning'); $('slMachine').style.setProperty('--hc', hex(I.color));
  noise(0.25, 0.08, 900);
  [0, 1, 2].forEach(i => {
    const s = strip(i, I.sym), dur = 1.4 + i * 0.55;
    s.style.transition = `transform ${dur}s cubic-bezier(.12,.75,.2,1.04)`;
    s.style.transform = `translateY(${-(STRIP - 2) * ROW + ROW}px)`;
    // ticking while each reel turns, a clunk as it stops
    for (let k = 0; k < dur * 10; k++) setTimeout(() => tone(1400 - k * 12, 0.02, 'square', 0.015, 1), k * 100);
    setTimeout(() => { tone(220, 0.1, 'square', 0.06, 0.6); noise(0.06, 0.08, 400); }, dur * 1000);
  });
  setTimeout(() => {
    $('slMachine').classList.remove('spinning'); $('slMachine').classList.add('win');
    setTimeout(() => $('slMachine').classList.remove('win'), 2400);
    const jackpot = p.kind === 'hero';
    (jackpot ? [523, 659, 784, 1047, 1319] : [659, 784, 988]).forEach((f, k) => tone(f, 0.2, 'triangle', 0.07, 1, k * 0.11));
    $('slWin').innerHTML = `
      <div class="sl-burst"></div>
      <small>${jackpot ? 'JACKPOT! New hero' : p.kind === 'spray' ? 'You won a spray' : 'You won a skin'}</small>
      <img src="${I.img || headshot(I.def)}" alt="" class="${p.kind}" style="--hc:${hex(I.color)}">
      <b>${I.title}</b><span>${I.sub}</span>
      <div class="sl-wa"><button class="bigbtn" data-use="${p.id}">${jackpot ? 'Play as ' + I.title : p.kind === 'spray' ? 'Equip spray' : 'Wear it'}</button><button class="ghost" data-close>Nice</button></div>`;
    $('slWin').classList.remove('hidden');
    busy = false; board();
  }, (1.4 + 2 * 0.55) * 1000 + 250);
  board();
}

export function enterSlots() {
  if (!wired) {
    wired = true;
    $('slReels').innerHTML = [0, 1, 2].map(i => `<div class="sl-reel"><div class="sl-strip"><i>${FILL[i]}</i><i>🎰</i><i>${FILL[i + 3]}</i></div></div>`).join('');
    $('slGo').onclick = pull; $('slLever').onclick = pull;
    $('slWin').onclick = e => {
      const use = e.target.closest('[data-use]');
      if (use) {
        const id = use.dataset.use, s = skinById(id);
        if (cosById(id)) equipCos('spray', id);
        else if (s) { equip(s.hero, s.id); cfg.hero = s.hero; } else cfg.hero = id;
        save(); tone(880, 0.1, 'triangle', 0.06, 1.3);
      }
      if (use || e.target.closest('[data-close]')) $('slWin').classList.add('hidden');
    };
  }
  $('slSpins').textContent = spins() ? `${spins()} pull${spins() > 1 ? 's' : ''} so far` : 'Feeling lucky?';
  board();
}
