import { G, $, toast } from './core.js?v=20261111l';
import { sfx, music, curTrack } from './audio.js?v=20261111l';

// KNABBELS WERKPLAATS: the shop on the station. Knabbel (the rock that eats everything) eats your bolts
// and spits out things for Rênas: suits, hats, jetpack trails, two upgrades, and a music box with every
// song you have heard. Open it from the rocket (travel menu) or from the main menu.
// Saved per save slot in save.shop = { own: { id: true }, suit, hat, trail, heard: { track: 1 } }.
const L = (nl, en, du) => (nl ? du : en);
const SUITS = { blauw: [0x7ac8ff, 0x4a90d8, 0xff7a3d], rood: [0xff7a7a, 0xd83a3a, 0xffd23a], groen: [0x8ae09a, 0x3aa84a, 0xffd23a], roze: [0xffa8dc, 0xd85aa8, 0x5ef2e0], ninja: [0x4a4a5a, 0x26262e, 0xff3a3a], goud: [0xffd84a, 0xc8961a, 0xffffff] };
const hex = (c) => `#${c.toString(16).padStart(6, '0')}`;
// [id, category, price, English, Dutch, swatch colour or emoji]
const ITEMS = [
  ['suit:blauw', 'suit', 0, 'Blue suit', 'Blauw pak', hex(SUITS.blauw[0])],
  ['suit:rood', 'suit', 60, 'Red suit', 'Rood pak', hex(SUITS.rood[0])],
  ['suit:groen', 'suit', 60, 'Green suit', 'Groen pak', hex(SUITS.groen[0])],
  ['suit:roze', 'suit', 60, 'Pink suit', 'Roze pak', hex(SUITS.roze[0])],
  ['suit:ninja', 'suit', 120, 'Ninja suit', 'Ninjapak', hex(SUITS.ninja[0])],
  ['suit:goud', 'suit', 250, 'Golden suit', 'Gouden pak', hex(SUITS.goud[0])],
  ['hat:geen', 'hat', 0, 'Nothing on', 'Niks op', '🫧'],
  ['hat:cape', 'hat', 80, 'Hero cape', 'Heldencape', '🦸'],
  ['hat:pirate', 'hat', 100, 'Pirate hat', 'Piratenhoed', '🏴‍☠️'],
  ['hat:cat', 'hat', 100, 'Cat ears (Kayo & Yara hate it)', 'Kattenoortjes (Kayo & Yara vinden het stom)', '🐱'],
  ['hat:crown', 'hat', 200, 'Crown', 'Kroon', '👑'],
  ['trail:blauw', 'trail', 0, 'Blue flame', 'Blauwe vlam', '#5ef2e0'],
  ['trail:vuur', 'trail', 70, 'Fire flame', 'Vuurvlam', '#ff7a2a'],
  ['trail:hartjes', 'trail', 70, 'Heart flame', 'Hartjesvlam', '#ff5a8a'],
  ['trail:goud', 'trail', 150, 'Golden flame', 'Gouden vlam', '#ffd23a'],
  ['trail:regenboog', 'trail', 150, 'Rainbow flame', 'Regenboogvlam', '🌈'],
  ['up:hart', 'up', 300, 'Extra heart: 4 hearts instead of 3', 'Extra hartje: 4 harten in plaats van 3', '❤️'],
  ['up:kompas', 'up', 120, 'Gear compass: the arrow points to golden gears close by', 'Tandwielkompas: de pijl wijst naar gouden tandwielen in de buurt', '🧭'],
];
const TRACKS = [['menu', 'Main menu', 'Hoofdmenu'], ['phonk', 'Planeta Phonk', 'Planeta Phonk'], ['boss1', 'DJ Miauwtron', 'DJ Miauwtron'], ['mine', 'De Diepe Mijn', 'De Diepe Mijn'], ['boss2', 'Gruis', 'Gruis'],
  ['ice', 'Hertogdom IJs', 'Hertogdom IJs'], ['boss4', 'Deniz', 'Deniz'], ['luck', 'Smaragdeiland', 'Smaragdeiland'], ['boss5', 'Lorcan', 'Lorcan'], ['jungle', 'Het Oerwoud', 'Het Oerwoud'], ['boss6', 'Koning Kokos', 'Koning Kokos'],
  ['lava', 'De Asberg', 'De Asberg'], ['boss7', 'Smeul', 'Smeul'], ['desert', 'Duinenrijk', 'Duinenrijk'], ['boss8', 'Gruizel', 'Gruizel'], ['sea', 'De Koraalzee', 'De Koraalzee'], ['boss10', 'Kraak', 'Kraak'],
  ['spook', 'Spookplaneet', 'Spookplaneet'], ['boss11', 'Koning Boe', 'Koning Boe'], ['moon', 'Maankrater', 'Maankrater'], ['boss9', 'Mecha-Miauw 2.0', 'Mecha-Miauw 2.0'], ['stadium', 'Homerun Heuvel', 'Homerun Heuvel'],
  ['boss3', 'Zennith', 'Zennith'], ['parkour', 'Parkour planets', 'Parkourplaneten'], ['werk', 'De Gouden Werkplaats', 'De Gouden Werkplaats'], ['boss12', 'Tandwieltron', 'Tandwieltron'], ['tempel', 'De Sterrentempel', 'De Sterrentempel'], ['finale', 'Finale', 'Finale']];
const SONG_PRICE = 20;
const TABS = [['suit', '👕', 'Suits', 'Pakjes'], ['hat', '🎩', 'Hats', 'Hoeden'], ['trail', '🔥', 'Flames', 'Vlammen'], ['up', '⭐', 'Upgrades', 'Upgrades'], ['music', '🎵', 'Music box', 'Muziekdoos']];

let api = null, tab = 'suit', from = null, playing = null;
export function initShop(a) {
  api = a;
  $('btnShopClose').onclick = () => { sfx.move(); closeShop(); };
  applyStyle();
}
export function shopData() {
  const s = api.save();
  s.shop = s.shop || {};
  const d = s.shop; d.own = d.own || {}; d.heard = d.heard || {};
  d.suit = d.suit || 'blauw'; d.hat = d.hat || 'geen'; d.trail = d.trail || 'blauw';
  return d;
}
const owns = (d, id) => ITEMS.find((x) => x[0] === id && x[2] === 0) || d.own[id];
// put everything on Rênas: suit colours, the hat, the flame, and the upgrades
export function applyStyle() {
  if (!api) return;
  const d = shopData(), R = api.model;
  const c = SUITS[d.suit] || SUITS.blauw;
  if (R.mats) { R.mats.suit.color.setHex(c[0]); R.mats.suitDark.color.setHex(c[1]); R.mats.orange.color.setHex(c[2]); }
  if (R.acc) for (const k in R.acc) R.acc[k].visible = d.hat === k;
  G.trail = d.trail;
  G.compass = !!d.own['up:kompas'];
}
export const shopMaxHp = () => (api && shopData().own['up:hart'] ? 4 : 3);
// every second: remember which songs you have heard, for the music box
export function shopTick() {
  if (!api) return;
  const t = curTrack(); if (!t) return;
  const d = shopData();
  if (!d.heard[t]) { d.heard[t] = 1; api.persist(); }
}

export function openShop(where) {
  from = where;
  G.paused = true; if (document.pointerLockElement) document.exitPointerLock();
  $('shop').classList.add('show');
  draw();
  const nl = api.nl();
  toast(L(nl, 'HAP! Knabbel eats bolts and spits out cool stuff.', 'HAP! Knabbel eet bouten en spuugt toffe spullen uit.'), 2600);
}
export function closeShop() {
  if (!$('shop').classList.contains('show')) return;
  $('shop').classList.remove('show');
  if (playing) { playing = null; music(api.backMusic()); }   // the music box stops: back to the music of where you are
  if (from === 'menu') G.paused = false;
}
export const shopOpen = () => $('shop').classList.contains('show');

function draw() {
  const d = shopData(), nl = api.nl();
  $('shopSub').innerHTML = `🔩 <b>${G.coins}</b> ${L(nl, 'bolts', 'bouten')}`;
  const tabs = $('shopTabs'); tabs.innerHTML = '';
  for (const [id, ic, en, du] of TABS) {
    const b = document.createElement('button'); b.className = 'btn small' + (tab === id ? ' on' : ''); b.textContent = `${ic} ${L(nl, en, du)}`;
    b.onclick = () => { sfx.move(); tab = id; draw(); };
    tabs.appendChild(b);
  }
  const list = $('shopList'); list.innerHTML = '';
  const card = (sw, name, right, cls, onclick) => {
    const b = document.createElement('button'); b.className = 'shopItem' + (cls ? ' ' + cls : '');
    const swatch = sw.startsWith('#') ? `<span class="ic" style="background:${sw}"></span>` : `<span class="ic">${sw}</span>`;
    b.innerHTML = `${swatch}<span class="nm">${name}</span><span class="price">${right}</span>`;
    b.onclick = onclick; list.appendChild(b);
  };
  if (tab === 'music') {
    for (const [id, en, du] of TRACKS) {
      const heard = !!d.heard[id], own = !!d.own['song:' + id];
      if (!heard) { card('❔', '???', L(nl, 'not heard yet', 'nog niet gehoord'), 'poor', () => { sfx.warn(); toast(L(nl, 'Play further to hear this song first!', 'Speel verder om dit liedje eerst te horen!')); }); continue; }
      card(playing === id ? '🔊' : '🎵', L(nl, en, du), own ? (playing === id ? '⏹' : '▶') : `🔩 ${SONG_PRICE}`, own ? (playing === id ? 'on' : '') : (G.coins < SONG_PRICE ? 'poor' : ''), () => {
        if (!own) { buy('song:' + id, SONG_PRICE, L(nl, en, du)); return; }
        sfx.select();
        if (playing === id) { playing = null; music(api.backMusic()); } else { playing = id; music(id); }
        draw();
      });
    }
    return;
  }
  for (const [id, cat, price, en, du, sw] of ITEMS) {
    if (cat !== tab) continue;
    const key = id.split(':')[1], own = owns(d, id);
    const worn = (cat === 'suit' && d.suit === key) || (cat === 'hat' && d.hat === key) || (cat === 'trail' && d.trail === key);
    const right = cat === 'up' ? (own ? '✅' : `🔩 ${price}`) : worn ? L(nl, '✅ on', '✅ aan') : own ? L(nl, 'wear', 'aantrekken') : `🔩 ${price}`;
    card(sw, L(nl, en, du), right, worn || (cat === 'up' && own) ? 'on' : !own && G.coins < price ? 'poor' : '', () => {
      if (!own) { buy(id, price, L(nl, en, du)); return; }
      if (cat === 'up') { sfx.select(); return; }
      sfx.select(); wear(cat, key); draw();
    });
  }
}
function wear(cat, key) {
  const d = shopData();
  if (cat === 'suit') d.suit = key; if (cat === 'hat') d.hat = key; if (cat === 'trail') d.trail = key;
  applyStyle(); api.persist();
}
function buy(id, price, name) {
  const nl = api.nl();
  if (G.coins < price) { sfx.warn(); toast(L(nl, `Knabbel wants ${price - G.coins} more bolts. HAP?`, `Knabbel wil nog ${price - G.coins} bouten. HAP?`), 2400); return; }
  G.coins -= price; api.spend();
  const d = shopData(); d.own[id] = true;
  const [cat, key] = id.split(':');
  if (cat === 'suit' || cat === 'hat' || cat === 'trail') wear(cat, key);
  if (id === 'up:hart') api.onHeart();
  applyStyle(); api.persist();
  sfx.hap(); setTimeout(() => sfx.rare(), 180);
  toast(`HAP! ${name} ✨`, 2400);
  draw();
}
