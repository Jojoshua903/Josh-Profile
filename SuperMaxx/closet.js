import { HEROES } from './heroes.js?v=20261126j';
import { cfg, save } from './settings.js?v=20261126j';
import { headshot } from './portraits.js?v=20261126j';
import { COS_TYPES, COSMETICS, cosById, cosOwned, cosTier, equippedCos, equipCos, cosArt, bannerCss,
  heroOwned, heroTier, skinsFor, skinOwned, skinTier, equip, dressed, dressedAny, isSlotItem, cosLock, isContractHero } from './pass.js?v=20261126j';

// Closet: everything you've collected in one place. The player card on the left shows what you're
// wearing; hovering any item tries it on. Click an owned item to equip it, click again to take it off.

const $ = id => document.getElementById(id);
const hex = c => '#' + c.toString(16).padStart(6, '0');
const TABS = [...Object.keys(COS_TYPES), 'skin'];
const tabLabel = t => t === 'skin' ? 'Skins' : COS_TYPES[t].label + 's';
const tabIcon = t => t === 'skin' ? '🎭' : COS_TYPES[t].icon;
let tab = 'title', blip = () => {}, wired = false;

function count(t) {
  if (t === 'skin') { const all = HEROES.flatMap(h => skinsFor(h.id)); return [all.filter(s => heroOwned(s.hero) && skinOwned(s.id)).length, all.length]; }
  const all = COSMETICS.filter(c => c.type === t); return [all.filter(c => cosOwned(c.id)).length, all.length];
}

// The player card, with an optional item being tried on.
function card(trial) {
  const eq = { ...equippedCos() };
  for (const [t, id] of Object.entries(eq)) if (!cosOwned(id)) delete eq[t];
  let hero = dressed(HEROES.find(h => h.id === cfg.hero && heroOwned(h.id)) || HEROES[0]);
  if (trial?.cos) eq[trial.cos.type] = trial.cos.id;
  if (trial?.skin) hero = trial.skin;
  const c = t => cosById(eq[t]);
  const banner = c('banner'), title = c('title'), tracer = c('tracer'), fx = c('killfx'), glider = c('glider'), spray = c('spray');
  const name = (cfg.name || '').trim().slice(0, 16).replace(/[<>&"'`]/g, '') || 'Player';
  const slot = (label, item, none) => `<span class="cc-slot" title="${label}"><span class="cc-art">${item ? cosArt(item) : `<i class="cc-none">${none}</i>`}</span><small>${label}</small></span>`;
  const total = TABS.map(count).reduce((a, [o, n]) => [a[0] + o, a[1] + n], [0, 0]);
  // the portrait sits fully inside the banner, framed by a glow in the hero's colour
  $('clCard').innerHTML = `
    <div class="cc-banner" style="${banner ? bannerCss(banner) : ''}">
      <span class="cc-glow" style="--hc:${hex(hero.color)}"></span>
      <img class="cc-hero" src="${headshot(hero)}" alt="" style="--hc:${hex(hero.color)}">
    </div>
    <div class="cc-name"><b>${name}</b><span class="cc-title ${title ? '' : 'none'}">${title ? title.name : 'No title'}</span></div>
    <div class="cc-hero-n"><span style="--hc:${hex(hero.color)}"></span>${hero.callsign}${hero.skinName ? ` · ${hero.skinName}` : ''}</div>
    <div class="cc-extras">
      ${slot('Tracer', tracer, 'None')}${slot('Effect', fx, 'None')}${slot('Glider', glider, 'None')}${slot('Spray', spray, 'None')}
    </div>
    <div class="cc-prog"><span>Collection</span><b>${total[0]} / ${total[1]}</b><i><em style="width:${Math.round(total[0] / Math.max(1, total[1]) * 100)}%"></em></i></div>
    ${trial ? `<div class="cc-try">Trying on${trial.locked ? ` · ${trial.locked}` : ''}</div>` : ''}`;
}

function loadout() {
  const eq = equippedCos();
  $('clLoad').innerHTML = Object.entries(COS_TYPES).map(([t, T]) => {
    const c = cosById(eq[t]), ok = c && cosOwned(c.id);
    return `<button data-slot="${t}" class="${ok ? 'on' : ''} ${tab === t ? 'cur' : ''}"><i>${T.icon}</i><small>${T.label}</small><b>${ok ? c.name : 'None'}</b></button>`;
  }).join('');
}

function tabs() {
  $('clTabs').innerHTML = TABS.map(t => { const [own, all] = count(t);
    return `<button data-tab="${t}" class="${t === tab ? 'on' : ''}" style="--p:${Math.round(own / Math.max(1, all) * 100)}%"><i>${tabIcon(t)}</i>${tabLabel(t)}<small>${own}/${all}</small><u></u></button>`; }).join('');
}

function grid() {
  const g = $('clGrid');
  if (tab === 'skin') {
    g.className = 'cl-grid skins';
    g.innerHTML = HEROES.map(h => {
      const own = heroOwned(h.id), cur = cfg.skins?.[h.id];
      const items = [{ id: '', name: 'Classic', def: h, ok: own, tier: lockOf(h.id) },
        ...skinsFor(h.id).map(s => ({ id: s.id, name: s.name, def: dressedAny(h, s), ok: own && skinOwned(s.id), tier: lockOf(h.id, s.id) }))];
      return `<div class="cl-hero"><h4 style="--hc:${hex(h.color)}">${h.callsign}${own ? '' : ` <small>🔒 ${lockOf(h.id)}</small>`}</h4><div class="cl-row">${items.map(it => {
        const on = own && (cur || '') === it.id;
        return `<button class="cl-it sk ${it.ok ? 'own' : 'lock'} ${on ? 'eq' : ''}" data-hero="${h.id}" data-skin="${it.id}" style="--hc:${hex(it.def.color)}">
          <img alt="" data-src="${h.id}|${it.id}"><b>${it.name}</b><span>${on ? '★ Wearing' : it.ok ? 'Equip' : `🔒 ${it.tier}`}</span></button>`;
      }).join('')}</div></div>`;
    }).join('');
    // portraits are rendered in 3D, so fill them in a few at a time
    g.querySelectorAll('img[data-src]').forEach((img, k) => setTimeout(() => {
      const [hid, sid] = img.dataset.src.split('|'), h = HEROES.find(x => x.id === hid), s = sid && skinsFor(hid).find(x => x.id === sid);
      img.src = headshot(s ? dressedAny(h, s) : h); img.classList.add('ok');
    }, 30 + k * 25));
    return;
  }
  g.className = 'cl-grid';
  const eq = equippedCos()[tab];
  const items = COSMETICS.filter(c => c.type === tab).sort((a, b) => cosTier(a.id) - cosTier(b.id));
  g.innerHTML = (tab === 'spray' ? '<p class="cl-sprayhint">Press <kbd>T</kbd> in a match to tag the wall or floor you’re looking at. Sprays are won at the slot machine.</p>' : '')
    + `<button class="cl-it none ${eq && cosOwned(eq) ? '' : 'eq'}" data-none="${tab}"><div class="ca"><span class="cl-x">∅</span></div><b>None</b><span>${eq && cosOwned(eq) ? 'Take off' : '★ Wearing'}</span></button>`
    + items.map(c => {
      const own = cosOwned(c.id), on = own && eq === c.id;
      return `<button class="cl-it ${own ? 'own' : 'lock'} ${on ? 'eq' : ''}" data-cos="${c.id}">${cosArt(c)}<b>${c.name}</b><span>${on ? '★ Wearing' : own ? 'Equip' : `🔒 ${cosLock(c.id)}`}</span></button>`;
    }).join('');
}

export function enterCloset(opts) {
  if (opts?.blip) blip = opts.blip;
  if (opts?.tab) tab = opts.tab;
  if (!wired) wire();
  card(); loadout(); tabs(); grid();
}

function refresh() { card(); loadout(); tabs(); grid(); }

function wire() {
  wired = true;
  $('clTabs').onclick = e => { const b = e.target.closest('[data-tab]'); if (!b) return; tab = b.dataset.tab; blip(640); loadout(); tabs(); grid(); };
  $('clLoad').onclick = e => { const b = e.target.closest('[data-slot]'); if (!b) return; tab = b.dataset.slot; blip(640); loadout(); tabs(); grid(); };
  $('clGrid').onclick = e => {
    const it = e.target.closest('.cl-it'); if (!it) return;
    if (it.dataset.none) { equipCos(it.dataset.none, null); blip(500); return refresh(); }
    if (it.dataset.cos) {
      const c = cosById(it.dataset.cos);
      if (!cosOwned(c.id)) { blip(150); it.classList.remove('nope'); void it.offsetWidth; it.classList.add('nope'); return; }
      const on = equippedCos()[c.type] === c.id;
      equipCos(c.type, on ? null : c.id); blip(on ? 500 : 900); return refresh();
    }
    if (it.dataset.hero) {
      if (!it.classList.contains('own')) { blip(150); it.classList.remove('nope'); void it.offsetWidth; it.classList.add('nope'); return; }
      equip(it.dataset.hero, it.dataset.skin || null);
      cfg.hero = it.dataset.hero; save();                              // wearing a skin also picks that hero
      blip(900); refresh();
    }
  };
  // hover to try something on
  $('clGrid').onmouseover = e => {
    const it = e.target.closest('.cl-it'); if (!it || it === $('clGrid')._hov) return;
    $('clGrid')._hov = it;
    if (it.dataset.cos) { const c = cosById(it.dataset.cos); card({ cos: c, locked: cosOwned(c.id) ? 0 : c.slot ? 'win it at the slots' : `unlocks at tier ${cosTier(c.id)}` }); }
    else if (it.dataset.hero) {
      const h = HEROES.find(x => x.id === it.dataset.hero), s = it.dataset.skin && skinsFor(h.id).find(x => x.id === it.dataset.skin);
      const def = s ? { ...dressedAny(h, s), skinName: s.name } : h;
      card({ skin: def, locked: it.classList.contains('own') ? 0 : lockOf(h.id, s?.id) });
    } else card();
  };
  $('clGrid').onmouseleave = () => { $('clGrid')._hov = null; card(); };
}

// What a locked skin is waiting on: the slot machine, or the later of its pass tier and its hero's.
function lockOf(heroId, skinId) {
  if (skinId && !heroOwned(heroId)) return `Get ${HEROES.find(h => h.id === heroId)?.callsign || 'hero'} first`;
  if (skinId && isSlotItem(skinId)) return 'Slot machine';
  if (isSlotItem(heroId) && !heroOwned(heroId)) return 'Slot machine hero';
  if (isContractHero(heroId) && !heroOwned(heroId)) return 'Recruitment contract';
  return `Tier ${Math.max(skinId ? skinTier(skinId) : 0, heroTier(heroId))}`;
}
