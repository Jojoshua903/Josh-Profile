'use strict';
/* ---------- chaos: living houses, bats, rolling pumpkins ---------- */
const BATS = {id: 'bats', name: 'Bat swarm', title: 'CHAOS', color: '#2a2238', kind: 'bats'};
const BIGPUMPKIN = {id: 'bigpumpkin', name: 'Rolling pumpkin', title: 'CHAOS', color: '#ff7a1f', kind: 'bigpumpkin'};
const houseChar = h => ({name: h.kind === 'res' ? `${h.res.name}’s house` : h.host ? `${h.host.name}’s house` : 'A house', title: 'IT’S ALIVE', kind: 'house', color: h.color, roof: h.roof});

function knockBack(fx, fy, dist) {
  const dx = P.x - fx, dy = P.y - fy, d = Math.hypot(dx, dy) || 1;
  for (let k = dist; k > 0; k -= 10) {
    const nx = P.x + dx / d * k, ny = P.y + dy / d * k;
    if (!solid(nx, ny)) { P.x = nx; P.y = ny; break; }
  }
  P.target = null; S.shakeUntil = performance.now() + 450;
}
function wakeHouse(h, angry) {
  if (!h || h.gone || h.kind === 'home') return false;
  h.gone = true;
  S.hazards.push({type: 'house', house: h, ch: houseChar(h), x: h.cx, y: h.y + h.h / 2, ox: h.cx, oy: h.y + h.h / 2,
    sp: (angry ? 150 : 118) + S.min * 0.2, until: S.min + rnd(10, 18), rad: 62, frozen: 0, flee: 0, stun: 0, loot: 0});
  S.shakeUntil = performance.now() + 900; sfx('scare');
  return true;
}
function wakeRandomHouses(n) {
  const dist = h => Math.hypot(h.cx - P.x, h.y + h.h / 2 - P.y);
  const pool = shuffle(S.houses.filter(h => h.kind !== 'home' && !h.gone && dist(h) > 220 && dist(h) < 900));
  return pool.slice(0, n).filter(h => wakeHouse(h)).length;
}
function spawnPumpkin() {
  const dy = Math.min(...HY.map(r => Math.abs(P.y - r))), dx = Math.min(...VX.map(r => Math.abs(P.x - r)));
  const s = snapRoad(P.x, P.y), dir = Math.random() < 0.5 ? 1 : -1;
  const p = dy <= dx ? {x: dir > 0 ? -40 : W + 40, y: s.y + rnd(-14, 14), vx: dir * 290, vy: 0}
                     : {x: s.x + rnd(-14, 14), y: dir > 0 ? -40 : H + 40, vx: 0, vy: dir * 290};
  S.hazards.push(Object.assign({type: 'pumpkin', ch: BIGPUMPKIN, until: S.min + 30, rad: 34, sp: 0, frozen: 0, flee: 0, stun: 0, loot: 0}, p));
}
function spawnBats() {
  const a = rnd(0, Math.PI * 2);
  S.hazards.push({type: 'bats', ch: BATS, x: clamp(P.x + Math.cos(a) * 420, 30, W - 30), y: clamp(P.y + Math.sin(a) * 420, 30, H - 30),
    until: S.min + 9, sp: 205, rad: 30, frozen: 0, flee: 0, stun: 0, loot: 0});
}

async function mimicReveal(h) {
  const host = h.host || {name: 'The house', color: h.color};
  sfx('knock');
  await scene(Object.assign({}, host, {title: 'ANSWERING THE DOOR…?'}), 'You knock. The door creaks open. Nobody’s there.<br><br>Wait. The doorframe is… breathing? Those aren’t steps. Those are <b>TEETH</b>.', ['RUN!!!']);
  wakeHouse(h, true);
  news(houseChar(h), `🏚️ ${houseChar(h).name} was a MIMIC! It stood up on four legs and it’s HUNGRY. Run!`);
}

/* ---------- the chaos director: random events, faster as the night goes on ---------- */
const WHISPERS = ['…did that window just blink?', 'You hear footsteps behind you. Nobody’s there.', 'A pumpkin turned its head to watch you.',
  'Somewhere, a doorbell rings by itself.', 'The wind whispers your name. Wrongly.', 'Was that house always on this side of the street?',
  'A crow is following you. It looks disappointed.', 'Every porch light flickers at once.', 'You smell burnt caramel. From where?',
  'Something under the street laughs. It sounds like Anker Vos.'];

const CHAOS = [
  {id: 'wake', w: 3, fn: () => {
    const n = wakeRandomHouses(S.min > 110 ? ri(2, 3) : ri(1, 2));
    if (n) news({name: 'THE STREET', title: 'IS AWAKE', kind: 'house', color: '#ffadad', roof: '#4a3a6a'}, `🏚️ The ground shakes… ${n === 1 ? 'a house just stood up' : n + ' houses just stood up'} on legs and started walking. Don’t let them catch you!`);
  }},
  {id: 'blackout', w: 1.4, fn: () => { S.blackUntil = S.min + 6; news(ZENNITH, '⚡ BLACKOUT. Every light on the street dies at once. Stay in the light of your lantern.'); }},
  {id: 'fog', w: 1.3, fn: () => { S.fogUntil = S.min + 11; news({name: 'THE FOG', title: 'ROLLS IN', kind: 'sheet', color: '#fff'}, '🌫️ A thick purple fog rolls in. You can barely see your own costume.'); }},
  {id: 'mirror', w: 1, fn: () => { S.scrambleUntil = performance.now() + 7000; news(META, '🪞 Mirror curse! Left is right, up is down, for 7 seconds.'); }},
  {id: 'bats', w: 1.4, fn: () => { spawnBats(); news(BATS, '🦇 A swarm of bats pours out of a chimney, straight at you!'); }},
  {id: 'pumpkin', w: 1.4, fn: () => { spawnPumpkin(); news(BIGPUMPKIN, '🎃 RUMBLE RUMBLE. Something huge and orange is rolling down your street. Get off the road!'); }},
  {id: 'candyrain', w: 1, fn: () => { for (let i = 0; i < 14; i++) { const p = freeSpot(P.x, P.y, 220); S.pickups.push({x: p.x, y: p.y, t: pickType('choc')}); } news({name: 'CANDY STORM', title: '', kind: 'round', color: '#ffc21f'}, '🍫 It’s raining chocolate?! Grab it before the houses do.'); }},
  {id: 'shuffle', w: 0.8, fn: () => {
    S.houses.filter(h => h.kind === 'event' && !h.done).forEach(h => { h.event = weightedEvent(); h.mimic = Math.random() < 0.18; });
    news({name: 'THE STREET', title: 'REARRANGED', kind: 'house', color: '#bdb2ff', roof: '#1fb5a6'}, '🌀 You blink and every house has changed. Nothing is where it was. Some doors look… hungrier.');
  }},
  {id: 'quake', w: 0.9, fn: () => { S.shakeUntil = performance.now() + 2200; dropCandy(2); S.friends.forEach(f => { f.x += rnd(-40, 40); f.y += rnd(-40, 40); }); news({name: 'EARTHQUAKE', title: '', kind: 'house', color: '#ffd6a5', roof: '#8b5a2b'}, '💥 The whole street jumps. Candy flies out of your bag!'); }},
  {id: 'teleport', w: 0.7, fn: () => {
    for (let i = 0; i < 20; i++) { const p = roadPoint(); if (!solid(p.x, p.y)) { P.x = p.x; P.y = p.y; P.target = null; break; } }
    addScare(10); news(GOONPOSTER, '👻 Icy hands grab you and drag you through the air… you’re somewhere else on the street now!');
  }},
  {id: 'clock', w: 0.8, fn: () => {
    const j = pick([10, 8, -6, -8]); S.min = Math.max(0, S.min + j);
    news({name: 'THE CLOCK', title: 'IS WRONG', kind: 'round', color: '#e6dcff'}, j > 0 ? `🕰️ The church bell rings ${j} minutes early. Time just… skipped.` : `🕰️ The clocks run backwards. You got ${-j} minutes back. Nobody knows how.`);
  }},
  {id: 'fox', w: 0.8, fn: () => { spawnHazard('fox', true); news(ANKER, '🦊 HAHAHAHA! Anker Vos crawls out of a bin. He brought friends: none. Just him. Laughing.'); }},
  {id: 'zennith', w: 0.6, fn: () => { S.darkUntil = Math.max(S.darkUntil, S.min + 8); spawnHazard('zennith'); news(ZENNITH, '👁️ Zennith returns without warning. The light goes out wherever it looks.'); }},
];

function chaosTick() {
  if (S.min < S.nextChaos) return;
  const pool = CHAOS.filter(c => c.id !== S.lastChaos);
  let tot = 0; pool.forEach(c => tot += c.w * (c.id === 'wake' ? 1 + S.min / 90 : 1));
  let r = Math.random() * tot, ev = pool[0];
  for (const c of pool) { r -= c.w * (c.id === 'wake' ? 1 + S.min / 90 : 1); if (r <= 0) { ev = c; break; } }
  S.lastChaos = ev.id; ev.fn();
  // events come faster and sometimes double up as the night gets late
  S.nextChaos = S.min + rnd(5, 12) * (1 - Math.min(1, S.min / 180) * 0.5);
  if (S.min > 120 && Math.random() < 0.25) S.nextChaos = S.min + 1.5;
}
function whisperTick(dt) {
  S.whisperT = (S.whisperT == null ? rnd(15, 30) : S.whisperT) - dt;
  if (S.whisperT > 0) return;
  S.whisperT = rnd(18, 40);
  toast('<i>' + pick(WHISPERS) + '</i>', 'weird');
  if (Math.random() < 0.35) sfx('scare');
}
