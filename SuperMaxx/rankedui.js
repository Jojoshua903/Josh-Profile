import { HEROES, ARCHETYPES } from './heroes.js?v=20261129f';
import { MAPS } from './data.js?v=20261129f';
import { cfg } from './settings.js?v=20261129f';
import { headshot } from './portraits.js?v=20261129f';
import { dressed, heroOwned, skinById } from './pass.js?v=20261129f';
import { canNight } from './stage.js?v=20261129f';
import { RANKS, RANK_REWARDS, ranked, rankOf, DIV } from './ranked.js?v=20261129f';

// The Ranked screen: your rank, the reward ladder and recent results, then the match itself. A ranked
// match rolls a random mode and stage, and both teams draft: everyone bans one hero, then everyone
// picks one (snake order, no duplicates, banned heroes are out). You draft against bots, who ban,
// pick to fill out their team's classes, and sometimes ban the hero you play most.

const $ = id => document.getElementById(id);
const hex = c => '#' + c.toString(16).padStart(6, '0');
export const RANKED_MODES = ['lane', 'hill', 'cart', 'ball'];
const MODE = { lane: ['Lane Breaker', '▶'], hill: ['Hill Rush', '♛'], cart: ['Payload', '🛒'], ball: ['Smash Ball', '⚽'] };
const BAN_S = 15, PICK_S = 20, BOT_T = [0.8, 1.6];
const BY_CLASS = () => ARCHETYPES.flatMap(a => HEROES.filter(h => h.arch === a.id));
let api = null, D = null, tick = 0, wired = false;

export function enterRanked(opts) {
  api = opts;
  if (!wired) {
    wired = true;
    $('rkBody').addEventListener('click', e => {
      const a = e.target.closest('[data-act]'); if (!a || a.disabled) return;
      if (a.dataset.act === 'find') { api.blip?.(880); startDraft(); }
      if (a.dataset.act === 'pick') choose(a.dataset.v);
      if (a.dataset.act === 'leave') { api.blip?.(400); stopDraft(); renderHome(); }
    });
  }
  if (!D) renderHome();
}
export const rankedDrafting = () => !!D;
export function leaveRanked() { stopDraft(); }

// ---------- home: rank, ladder, history ----------
function renderHome() {
  const R = ranked(), r = R.rank, legend = r.i === RANKS.length - 1;
  const ladder = RANKS.map((k, i) => {
    const rw = RANK_REWARDS.filter(x => x.rank === i), got = R.best >= i * 3 * DIV, here = r.i === i;
    return `<li class="${got ? 'got' : ''} ${here ? 'here' : ''}" style="--rc:${hex(k.color)}"><i>${k.icon}</i><div><b>${k.name}</b>
      ${rw.length ? rw.map(x => `<small>${rewardChip(x)}</small>`).join('') : `<small class="none">${i === 0 ? 'Where everyone starts' : ''}</small>`}</div>
      <em>${got ? (rw.length && i > 0 ? '✓ Claimed' : '✓') : `${i * 3 * DIV} RP`}</em></li>`;
  }).reverse().join('');
  const hist = R.hist.slice(0, 6).map(m => { const h = HEROES.find(x => x.id === m.hero);
    return `<li class="${m.win ? 'w' : 'l'}"><b>${m.win ? 'Win' : 'Loss'}</b><span>${MODE[m.mode]?.[0] || ''} · ${MAPS.find(x => x.id === m.map)?.name || ''}</span>${h ? `<img src="${headshot(h)}" alt="">` : ''}<em>${m.d > 0 ? '+' : ''}${m.d} RP</em></li>`; }).join('');
  $('rkBody').innerHTML = `<div class="rk-home">
    <section class="rk-card rk-me" style="--rc:${hex(r.color)}">
      <div class="rk-emblem"><i>${r.icon}</i></div>
      <h2>${r.label}</h2>
      ${legend ? `<p class="rk-rp"><b>${r.rp.toLocaleString()} RP</b> · the top of the ladder</p>` : `<div class="rk-bar"><i style="width:${(r.frac * 100).toFixed(1)}%"></i></div>
      <p class="rk-rp"><b>${r.into} / ${r.need} RP</b> to ${nextLabel(r)}</p>`}
      <div class="rk-stats"><span><b>${R.w}</b>Wins</span><span><b>${R.l}</b>Losses</span><span><b>${R.streak > 0 ? '🔥 ' + R.streak : R.streak < 0 ? -R.streak : 0}</b>${R.streak < 0 ? 'Loss streak' : 'Win streak'}</span><span><b>${R.bestRank.icon}</b>Best: ${R.bestRank.label}</span></div>
      <button class="bigbtn rk-go" data-act="find">Find match ▸</button>
      <ul class="rk-rules"><li>🎲 A random mode (Lane Breaker, Hill Rush, Payload or Smash Ball) on a random stage</li>
        <li>🚫 Draft: everyone bans one hero, then everyone picks one. No duplicates</li>
        <li>🤖 The bots get sharper as you climb</li>
        <li>📈 Win for +22 RP or more (more for playing well and win streaks). A loss can only drop you to the bottom of your current rank: you only drop a rank if you lose again from there</li>
        <li>⚠️ No player level or season pass XP. Leaving a match early counts as a loss</li></ul>
    </section>
    <section class="rk-card rk-ladder"><h4>Rewards</h4><ul>${ladder}</ul></section>
    <section class="rk-card rk-hist"><h4>Recent matches</h4>${hist ? `<ul>${hist}</ul>` : '<p class="rk-none">No ranked matches yet. Your first one is waiting.</p>'}</section>
  </div>`;
}
const nextLabel = r => { const n = rankOf(r.rp + (r.need - r.into)); return n.label; };
function rewardChip(x) {
  if (x.type === 'tokens') return `🎰 ${x.label}`;
  if (x.type === 'hero') { const h = HEROES.find(k => k.id === x.id); return `${h ? `<img src="${headshot(h)}" alt="">` : ''}New hero: <b>${h?.callsign || x.id}</b>`; }
  const s = skinById(x.id), h = HEROES.find(k => k.id === s?.hero);
  return `${h ? `<img src="${headshot(dressed(h, s.id))}" alt="" onerror="this.remove()">` : ''}<span class="leg">★ Legendary</span> ${h?.callsign || ''} · <b>${s?.name || x.id}</b>${x.bonus ? ` + ${x.bonus} tokens` : ''}`;
}

// ---------- the draft ----------
function startDraft() {
  stopDraft();
  const mode = RANKED_MODES[Math.floor(Math.random() * RANKED_MODES.length)];
  const map = MAPS[Math.floor(Math.random() * MAPS.length)], night = canNight(map) && Math.random() < 0.3;
  const slots = [['b0', 'blue', 'You'], ['b1', 'blue', 'Ally bot'], ['b2', 'blue', 'Ally bot'], ['r0', 'red', 'Enemy bot'], ['r1', 'red', 'Enemy bot'], ['r2', 'red', 'Enemy bot']].map(([key, team, who]) => ({ key, team, who }));
  const order = ['b0', 'r0', 'b1', 'r1', 'b2', 'r2', 'b0', 'r0', 'r1', 'b1', 'b2', 'r2'];
  D = { mode, map, night, slots, order, kinds: order.map((_, i) => i < 6 ? 'ban' : 'pick'), turn: -1, bans: {}, picks: {}, rollT: 1.6, until: 0, botAt: 0, done: 0 };
  render();
  tick = setInterval(step, 100);
}
function stopDraft() { clearInterval(tick); tick = 0; D = null; }
const used = () => [...Object.values(D.picks), ...Object.values(D.bans)];
const free = () => HEROES.filter(h => !used().includes(h.id));
const kind = () => D.kinds[D.turn] || 'pick';
const cur = () => D.order[D.turn];
function nextTurn() {
  D.turn++;
  if (D.turn >= D.order.length) { D.done = 1.8; render(); return; }
  const me = cur() === 'b0';
  D.until = Date.now() + (me ? (kind() === 'ban' ? BAN_S : PICK_S) * 1000 : 0);
  D.botAt = Date.now() + (BOT_T[0] + Math.random() * (BOT_T[1] - BOT_T[0])) * 1000;
  render();
  if (me) api.blip?.(kind() === 'ban' ? 520 : 760);
}
function step() {
  if (!D) return;
  if (D.rollT > 0) {                                     // the mode and stage roll like a slot machine first
    D.rollT -= 0.1;
    const m = $('rkRollMode'), s = $('rkRollMap');
    if (D.rollT > 0) { if (m) m.textContent = MODE[RANKED_MODES[Math.floor(Math.random() * 4)]][0]; if (s) s.textContent = MAPS[Math.floor(Math.random() * MAPS.length)].name; api.blip?.(300 + Math.random() * 200); }
    else { api.blip?.(990); nextTurn(); }
    return;
  }
  if (D.done) {
    if ((D.done -= 0.1) <= 0) launch();
    return;
  }
  const k = cur();
  if (k === 'b0') {
    const c = $('rkClock'); if (c) c.textContent = `${Math.max(0, Math.ceil((D.until - Date.now()) / 1000))}s`;
    if (Date.now() > D.until) { const f = free(), mine = f.filter(h => heroOwned(h.id)), from = kind() === 'ban' || !mine.length ? f : mine; take(from[Math.floor(Math.random() * from.length)].id); }
  } else if (Date.now() > D.botAt) take(botChoice(k));
}
function botChoice(key) {
  const f = free(), team = key[0] === 'b' ? 'blue' : 'red';
  if (kind() === 'ban') {
    // enemy bots sometimes ban the hero you play most; otherwise anyone
    if (team === 'red' && Math.random() < 0.45 && f.some(h => h.id === cfg.hero)) return cfg.hero;
    return f[Math.floor(Math.random() * f.length)].id;
  }
  // picks: fill out the team's classes, tank and support first
  const have = D.slots.filter(s => s.team === team && D.picks[s.key]).map(s => HEROES.find(h => h.id === D.picks[s.key])?.arch);
  for (const arch of ['tank', 'support', 'damage', 'control']) {
    if (have.includes(arch)) continue;
    const opts = f.filter(h => h.arch === arch); if (opts.length) return opts[Math.floor(Math.random() * opts.length)].id;
  }
  return f[Math.floor(Math.random() * f.length)].id;
}
function choose(id) {
  if (!D || D.rollT > 0 || D.done || cur() !== 'b0') return;
  if (used().includes(id) || (kind() === 'pick' && !heroOwned(id))) return;
  api.blip?.(kind() === 'ban' ? 300 : 880);
  take(id);
}
function take(id) {
  (kind() === 'ban' ? D.bans : D.picks)[cur()] = id;
  nextTurn();
}
function launch() {
  const s = D, pick = k => s.picks[k];
  stopDraft();
  api.onRanked({ mode: s.mode, map: s.map.id, night: s.night, me: pick('b0'), blue: [pick('b1'), pick('b2')], red: [pick('r0'), pick('r1'), pick('r2')], bans: Object.values(s.bans) });
}

function render() {
  if (!D) return;
  const rolling = D.rollT > 0, done = D.turn >= D.order.length, k = cur(), mine = !rolling && !done && k === 'b0', banning = !done && kind() === 'ban';
  const nBan = 6, step = D.turn < nBan ? D.turn + 1 : D.turn - nBan + 1;
  const col = team => `<div class="teamcol ${team}"><h4>${team === 'blue' ? 'Your team' : 'Enemy team'}</h4>${D.slots.filter(s => s.team === team).map(s => {
    const h = HEROES.find(x => x.id === D.picks[s.key]), b = HEROES.find(x => x.id === D.bans[s.key]), now = !rolling && !done && s.key === k;
    const art = h ? (s.key === 'b0' ? dressed(h) : h) : null;
    return `<div class="slot dr ${s.key === 'b0' ? 'me' : ''} ${now ? 'now' : ''} ${now && banning ? 'banning' : ''} ${h ? '' : 'empty'}" style="--hc:${h ? hex(h.color) : '#c8c0b0'}">
      ${h ? `<img src="${headshot(art)}" alt="">` : `<span>${now ? (banning ? '🚫' : '⏳') : s.key === 'b0' ? '👤' : '🤖'}</span>`}
      <div><b>${s.who}</b><small>${h ? h.callsign : now ? (banning ? 'banning…' : 'picking…') : ''}</small></div>
      ${b ? `<i class="dr-ban" title="Banned ${b.callsign}"><img src="${headshot(b)}" alt=""></i>` : ''}</div>`;
  }).join('')}</div>`;
  const taken = new Set(Object.values(D.picks)), banned = new Set(Object.values(D.bans));
  const grid = BY_CLASS().map(h => {
    const own = heroOwned(h.id), t = taken.has(h.id), x = banned.has(h.id), off = !mine || t || x || (!banning && !own);
    return `<button class="dr-h ${t ? 'taken' : ''} ${x ? 'banned' : ''} ${own || banning ? '' : 'locked'}" data-act="pick" data-v="${h.id}" ${off ? 'disabled' : ''} style="--hc:${hex(h.color)}" title="${h.callsign} · ${h.role}">
      <img src="${headshot(h)}" alt=""><b>${h.callsign}</b>${x ? '<i>Banned</i>' : t ? '<i>Taken</i>' : !own && !banning ? '<i>🔒</i>' : ''}</button>`;
  }).join('');
  const head = rolling ? 'Finding a match…' : done ? 'Draft complete · get ready!' : mine ? (banning ? 'Your ban!' : 'Your pick!') : `${D.slots.find(s => s.key === k).who} is ${banning ? 'banning' : 'picking'}…`;
  const note = rolling ? 'Rolling a mode and a stage.' : banning ? (mine ? 'Ban any hero, even one you don’t own. Nobody on either team can pick it.' : 'Everyone bans one hero first, then everyone picks.')
    : (mine ? 'Pick one of your heroes. If time runs out you get a random one.' : 'Banned heroes are out, and each hero can only be picked once.');
  const [mn, mi] = MODE[D.mode];
  $('rkBody').innerHTML = `<div class="lobby draft rk-draft">
    <div class="rk-match ${rolling ? 'rolling' : ''}"><span><small>Mode</small><b id="rkRollMode">${rolling ? '…' : `${mi} ${mn}`}</b></span><span><small>Stage</small><b id="rkRollMap">${rolling ? '…' : `${D.night ? '🌙 ' : ''}${D.map.name}${D.night ? ' · night' : ''}`}</b></span><span><small>Rank</small><b>${ranked().rank.icon} ${ranked().rank.label}</b></span></div>
    <div class="dr-top ${mine ? 'mine' : ''} ${banning && !rolling ? 'ban' : ''}"><small>${rolling ? 'Ranked' : done ? 'Draft' : banning ? `Ban phase · ban ${step} of ${nBan}` : `Pick phase · pick ${step} of 6`}</small><b>${head}</b><span id="rkClock">${mine ? `${Math.max(0, Math.ceil((D.until - Date.now()) / 1000))}s` : ''}</span></div>
    <div class="teams">${col('blue')}<div class="vs">VS</div>${col('red')}</div>
    ${banned.size ? `<div class="dr-bans"><b>Banned</b>${[...banned].map(id => { const h = HEROES.find(x => x.id === id); return h ? `<span style="--hc:${hex(h.color)}"><img src="${headshot(h)}" alt="">${h.callsign}</span>` : ''; }).join('')}</div>` : ''}
    <div class="dr-grid ${banning ? 'banning' : ''}">${grid}</div>
    <p class="dr-note">${note}</p>
    ${done ? '' : '<button class="ghost" data-act="leave">Leave draft</button>'}
  </div>`;
}
