import { HEROES, ARCHETYPES } from './heroes.js?v=20261129f';
import { splash, headshot } from './portraits.js?v=20261129f';
import { dressed, heroOwned, lockLong } from './pass.js?v=20261129f';
import { masteryOf } from './mastery.js?v=20261129f';
import { keyOf } from './keys.js?v=20261129f';
import { cfg, save } from './settings.js?v=20261129f';
import { GUIDES } from './guides.js?v=20261129f';

// The Heroes page: every hero's kit, stats and a written guide. A searchable list on the left,
// grouped by class, and the selected hero on the right.

const $ = id => document.getElementById(id);
const hex = c => '#' + c.toString(16).padStart(6, '0');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
let api = null, pick = null, filter = 'all', query = '', wired = false;

// Sustained damage a second: a full magazine, then the reload.
function dps(w) {
  const per = w.dmg * (w.pellets || w.burst || w.quills || w.fan || 1);
  const rate = w.mode === 'charge' ? (w.chargeTime || 1) + w.rate : w.rate;
  const mag = Math.min(w.mag || 1, 60);
  return per * mag / (mag * rate + (w.reload || 0));
}
const STAT = {
  hp: h => h.hp, speed: h => h.speed, dps: h => dps(h.weapon), range: h => Math.min(100, h.weapon.range || 0),
};
const MAX = {};
const maxOf = k => MAX[k] ??= Math.max(...HEROES.map(h => STAT[k](h)));
const DIFF = ['', 'Easy', 'Medium', 'Tricky'];
const KIT = [['weapon', 'Fire', null], ['passive', 'Passive', null], ['q', 'Ability 1', 'q'], ['ability', 'Ability 2', 'ability'], ['ult', 'Ultimate', 'ult']];

export function enterHeroes(opts) {
  api = opts;
  if (!wired) {
    wired = true;
    $('hxSearch').addEventListener('input', e => { query = e.target.value.trim().toLowerCase(); renderList(); });
    $('hxSearch').addEventListener('keydown', e => e.stopPropagation());
    $('hxFilter').onclick = e => { const b = e.target.closest('[data-f]'); if (!b) return; filter = b.dataset.f; api.blip?.(700); renderFilter(); renderList(); };
    $('hxList').onclick = e => { const b = e.target.closest('[data-h]'); if (b) show(b.dataset.h, true); };
    $('hxDetail').onclick = e => {
      const p = e.target.closest('[data-pair]'); if (p) return show(p.dataset.pair, true);
      const a = e.target.closest('[data-act]'); if (!a) return;
      if (a.dataset.act === 'practice') { api.blip?.(760); api.practice(pick); }
      if (a.dataset.act === 'play' && heroOwned(pick)) { api.blip?.(880); cfg.hero = pick; save(); api.go('roster'); }
    };
  }
  pick = HEROES.find(h => h.id === pick) ? pick : (HEROES.find(h => h.id === cfg.hero) || HEROES[0]).id;
  renderFilter(); renderList(); show(pick, false);
}
// arrow keys step through the visible list
export function stepHeroes(d) {
  const list = visible(); if (!list.length) return;
  const i = list.findIndex(h => h.id === pick);
  show(list[((i < 0 ? 0 : i + d) + list.length) % list.length].id, true, true);
}

const visible = () => ARCHETYPES.flatMap(a => HEROES.filter(h => h.arch === a.id)).filter(h =>
  (filter === 'all' || h.arch === filter) && (!query || [h.callsign, h.name, h.role].some(s => s.toLowerCase().includes(query))));

function renderFilter() {
  $('hxFilter').innerHTML = [['all', '✦', 'All'], ...ARCHETYPES.map(a => [a.id, a.icon, a.name])].map(([k, i, l]) =>
    `<button data-f="${k}" class="${filter === k ? 'on' : ''}"><i>${i}</i>${l}<em>${k === 'all' ? HEROES.length : HEROES.filter(h => h.arch === k).length}</em></button>`).join('');
}
function renderList() {
  const list = visible();
  let last = null;
  $('hxList').innerHTML = list.length ? list.map(h => {
    const a = ARCHETYPES.find(x => x.id === h.arch), head = filter === 'all' && h.arch !== last ? `<h5 style="--ac:${hex(a.color)}">${a.icon} ${a.name}</h5>` : '';
    last = h.arch;
    const own = heroOwned(h.id), g = GUIDES[h.id];
    return `${head}<button class="hx-row ${h.id === pick ? 'on' : ''} ${own ? '' : 'locked'}" data-h="${h.id}" style="--hc:${hex(h.color)}">
      <img alt="" data-hx="${h.id}"><span><b>${h.callsign}</b><small>${h.role}</small></span>${own ? '' : '<i>🔒</i>'}${g ? `<em class="d${g.diff}" title="${DIFF[g.diff]}">${'●'.repeat(g.diff)}${'○'.repeat(3 - g.diff)}</em>` : ''}</button>`;
  }).join('') : '<p class="hx-none">No heroes match that search.</p>';
  $('hxList').querySelectorAll('img[data-hx]').forEach((img, k) => setTimeout(() => { img.src = headshot(dressed(HEROES.find(x => x.id === img.dataset.hx))); }, 10 + k * 25));
}

function show(id, sound, scroll) {
  const h = HEROES.find(x => x.id === id); if (!h) return;
  if (sound && id !== pick) api.blip?.(620);
  pick = id;
  for (const el of $('hxList').querySelectorAll('[data-h]')) el.classList.toggle('on', el.dataset.h === id);
  if (scroll) $('hxList').querySelector('.on')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  const g = GUIDES[id] || {}, a = ARCHETYPES.find(x => x.id === h.arch), own = heroOwned(id), m = masteryOf(id), d = dressed(h), w = h.weapon;
  const bar = (k, label, fmt) => { const v = STAT[k](h); return `<div class="hx-stat"><span>${label}</span><i><b style="width:${Math.max(6, v / maxOf(k) * 100).toFixed(1)}%"></b></i><em>${fmt(v)}</em></div>`; };
  const nums = s => {                                   // the key numbers for an ability, as small chips
    const out = [];
    if (s.cd) out.push(`⏱ ${s.cd}s`); if (s.cost) out.push(`⚡ ${s.cost} charge`);
    if (s.dmg && s.dmg > 3) out.push(`💥 ${s.dmg}`); if (s.dps) out.push(`🔥 ${s.dps}/s`); if (s.heal) out.push(`✚ ${s.heal}`);
    if (s.dur) out.push(`⌛ ${s.dur}s`); if (s.range) out.push(`↔ ${s.range}m`); if (s.radius) out.push(`◎ ${s.radius}m`);
    return out.slice(0, 4).map(x => `<span>${x}</span>`).join('');
  };
  const wnums = [`💥 ${w.dmg}${w.pellets ? ` × ${w.pellets}` : w.burst ? ` × ${w.burst}` : w.quills ? ` × ${w.quills}` : w.fan ? ` × ${w.fan}` : ''}`, `🔁 ${(1 / w.rate).toFixed(1)}/s`, w.mag < 99 ? `🧺 ${w.mag}` : '', `↔ ${w.range}m`].filter(Boolean).map(x => `<span>${x}</span>`).join('');
  const kit = KIT.map(([slot, label, key]) => {
    const s = h[slot]; if (!s) return '';
    return `<div class="hx-ab ${slot}"><div class="hx-key">${key ? `<kbd>${keyOf(key)}</kbd>` : slot === 'weapon' ? '<kbd>🖱</kbd>' : '<kbd>✦</kbd>'}<small>${label}</small></div>
      <div class="hx-abt"><b>${esc(s.name)}</b><p>${esc(s.desc || '')}</p><div class="hx-nums">${slot === 'weapon' ? wnums : nums(s)}</div></div></div>`;
  }).join('');
  const pairs = (g.pair || []).map(pid => HEROES.find(x => x.id === pid)).filter(Boolean);
  $('hxDetail').style.setProperty('--hc', hex(h.color));
  const el = $('hxDetail');
  el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
  el.innerHTML = `
    <header class="hx-hero">
      <div class="hx-art"><img alt="" src="${splash(d)}"></div>
      <div class="hx-id">
        <div class="hx-tags"><span style="--ac:${hex(a.color)}">${a.icon} ${a.name}</span>${g.diff ? `<span class="d${g.diff}">${'●'.repeat(g.diff)}${'○'.repeat(3 - g.diff)} ${DIFF[g.diff]}</span>` : ''}${own ? `<span class="mst" style="--mc:${m.rank.color}">${m.rank.name} · Lv ${m.level}</span>` : '<span class="lock">🔒 Locked</span>'}</div>
        <h2>${h.callsign}</h2>
        <p class="hx-real">${esc(h.name)} · ${esc(h.role)}</p>
        <blockquote>“${esc(h.quote)}”</blockquote>
        <div class="hx-stats">
          ${bar('hp', 'Health', v => v)}
          ${bar('dps', 'Damage', v => `${Math.round(v)}/s`)}
          ${bar('range', 'Range', v => `${v}m`)}
          ${bar('speed', 'Speed', v => v.toFixed(1))}
        </div>
        <div class="hx-cta">
          ${own ? '<button class="bigbtn" data-act="play">Play as ' + h.callsign + ' ▸</button>' : `<div class="hx-lock">🔒 ${esc(lockLong(id))}</div>`}
          <button class="ghost" data-act="practice">🎯 ${own ? 'Practice' : 'Try'} the kit</button>
        </div>
      </div>
    </header>
    <section class="hx-sec"><h4>Who they are</h4><p>${esc(h.bio)}</p></section>
    ${g.style ? `<section class="hx-sec hx-style"><h4>How to play</h4><p>${esc(g.style)}</p></section>` : ''}
    <section class="hx-sec"><h4>Kit</h4><div class="hx-kit">${kit}</div></section>
    ${g.tips ? `<section class="hx-sec"><h4>Tips</h4><ol class="hx-tips">${g.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ol></section>` : ''}
    ${g.combo ? `<section class="hx-sec hx-combo"><h4>Go-to combo</h4><p>${esc(g.combo).replace(/→/g, '<i>→</i>')}</p></section>` : ''}
    ${g.good || g.weak ? `<section class="hx-sec hx-match"><div class="good"><h4>👍 Strong at</h4><p>${esc(g.good)}</p></div><div class="weak"><h4>⚠️ Watch out for</h4><p>${esc(g.weak)}</p></div></section>` : ''}
    ${pairs.length ? `<section class="hx-sec"><h4>Works well with</h4><div class="hx-pairs">${pairs.map(p => `<button data-pair="${p.id}" style="--hc:${hex(p.color)}"><img alt="" src="${headshot(dressed(p))}"><span><b>${p.callsign}</b><small>${p.role}</small></span></button>`).join('')}</div></section>` : ''}`;
  el.scrollTop = 0;
}
