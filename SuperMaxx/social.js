import { HEROES } from './heroes.js?v=20261128e';
import { MAPS, SURVIVOR_MAP } from './data.js?v=20261128e';
import { cfg } from './settings.js?v=20261128e';
import { headshot } from './portraits.js?v=20261128e';
import { masteryOf } from './mastery.js?v=20261128e';
import { statOf } from './contracts.js?v=20261128e';
import { passXp, tierProgress, heroOwned, MAX_TIER } from './pass.js?v=20261128e';
import { history } from './history.js?v=20261128e';
import { loadFirebase, setUserChangeHook, setAccountRedraw, accountHTML, accountAct, accountEnter, accountBusy, accountOpened, myAccount, ago, esc } from './account.js?v=20261128e';
import * as net from './net.js?v=20261128e';
import { joinFriend } from './online.js?v=20261128e';

// The Profile screen (👤 on the main menu): your profile card, match history, friends and account.
//
// Signed-in players publish profiles/{uid} = { name, code, card, online, seen, room } so friends can
// see their card, whether they're on and which room they're in. Friends are a private list at
// users/{uid}/friends. Adding someone by their friend code (codes/{CODE} → uid) also drops a request
// in requests/{theirUid}/{you} so they can add you back. invites/{uid}/{from} carries room invites.

const $ = id => document.getElementById(id);
const hex = c => '#' + c.toString(16).padStart(6, '0');
const MODE = { lane: 'Lane Breaker', survivor: 'Survivor', hill: 'Hill Rush', cart: 'Payload', potato: 'Hot Potato', duel: 'Duel', raid: 'Boss Raid' };
const mapName = id => id === SURVIVOR_MAP.id ? SURVIVOR_MAP.name : MAPS.find(m => m.id === id)?.name || '';

// ---------- your card ----------
export function cardData() {
  const ranked = HEROES.map(h => ({ h, m: masteryOf(h.id) })).sort((a, b) => b.m.xp - a.m.xp);
  const main = ranked[0].m.xp > 0 ? ranked[0] : null;
  const played = statOf('played'), wins = statOf('wins');
  return {
    name: (cfg.name || '').trim().slice(0, 16) || 'Player',
    main: main ? { id: main.h.id, level: main.m.level, rank: main.m.rank.name, color: main.m.rank.color } : null,
    played, wins, kills: statOf('kills'), dmg: statOf('dmg'), heal: statOf('heal'),
    tier: tierProgress(passXp()).tier, heroes: HEROES.filter(h => heroOwned(h.id)).length,
  };
}
function cardHTML(c, extra = '') {
  const h = HEROES.find(x => x.id === c.main?.id) || HEROES.find(x => x.id === cfg.hero) || HEROES[0];
  const rate = c.played ? Math.round(c.wins / c.played * 100) : 0;
  const stat = (v, l) => `<div><b>${v}</b><small>${l}</small></div>`;
  return `<div class="pc" style="--hc:${hex(h.color)}">
    <div class="pc-top"><img src="${headshot(h)}" alt=""><div><small>Player card</small><b>${esc(c.name)}</b>
      <span>${c.main ? `Main: ${h.callsign} · <i style="color:${esc(c.main.color)}">${c.main.rank}</i> Lv ${c.main.level}` : 'No main yet: play some matches!'}</span></div></div>
    <div class="pc-stats">${stat(c.played.toLocaleString(), 'Matches')}${stat(c.wins.toLocaleString(), 'Wins')}${stat(rate + '%', 'Win rate')}
      ${stat(c.kills.toLocaleString(), 'Eliminations')}${stat(Math.round(c.dmg / 1000).toLocaleString() + 'k', 'Damage')}${stat(`${c.tier}/${MAX_TIER}`, 'Pass tier')}
      ${stat(`${c.heroes}/${HEROES.length}`, 'Heroes')}${stat(Math.round(c.heal / 1000).toLocaleString() + 'k', 'Healing')}</div>${extra}</div>`;
}

// ---------- match history ----------
function historyHTML() {
  const L = history();
  if (!L.length) return '<p class="hb-empty">No matches yet. Your last 30 show up here.</p>';
  const w = L.filter(e => e.win).length;
  return `<p class="hb-sum">Last ${L.length}: <b>${w} won</b> · ${L.length - w} lost</p><div class="mh">${L.map(e => {
    const h = HEROES.find(x => x.id === e.hero) || HEROES[0];
    const res = e.mode === 'survivor' && e.place ? `#${e.place}` : e.win ? 'Win' : 'Loss';
    return `<div class="mh-r ${e.win ? 'w' : 'l'}" style="--hc:${hex(h.color)}"><img src="${headshot(h)}" alt="">
      <div class="mh-m"><b>${MODE[e.mode] || e.mode}${e.online ? ' <i>Online</i>' : ''}</b><small>${h.callsign} · ${mapName(e.map)} · ${ago(e.t)}</small></div>
      <div class="mh-s"><span>${e.kills}<small>K</small></span><span>${e.deaths}<small>D</small></span><span>${(e.dmg / 1000).toFixed(1)}k<small>DMG</small></span></div>
      <em>${res}</em></div>`;
  }).join('')}</div>`;
}

// ---------- friends (needs an account) ----------
let me = null;                       // { uid, code } while signed in
const S = { friends: {}, profiles: {}, requests: {}, invites: {}, unsubs: [], fUnsubs: {} };
let fui = { err: '', msg: '', busy: false };
const CODE_CH = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function codeFor(uid, salt = 0) {
  let h = 2166136261 + salt; for (const c of uid) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  let s = ''; for (let i = 0; i < 6; i++) { s += CODE_CH[(h >>> 0) % CODE_CH.length]; h = Math.imul(h ^ (h >>> 13), 2246822507); }
  return s;
}

async function startSocial() {
  stopSocial();
  const a = myAccount(); if (!a) return;
  try {
    const F = await loadFirebase(), { db, dbM, auth } = F, uid = auth.currentUser?.uid;
    if (!uid || uid !== a.uid || auth.currentUser.isAnonymous) return;
    const R = p => dbM.ref(db, p);
    // a friend code that's ours: try the natural one, then salted ones if it's taken
    let code = null;
    for (let salt = 0; salt < 5 && !code; salt++) {
      const c = codeFor(uid, salt), s = await dbM.get(R('codes/' + c));
      if (!s.exists()) { await dbM.set(R('codes/' + c), uid); code = c; } else if (s.val() === uid) code = c;
    }
    me = { uid, code, R, dbM };
    const pr = R('profiles/' + uid);
    await dbM.update(pr, { name: cardData().name, code, card: cardData(), online: true, seen: dbM.serverTimestamp(), room: net.lobbyState()?.code || null });
    dbM.onDisconnect(pr).update({ online: false, seen: dbM.serverTimestamp(), room: null });
    S.unsubs.push(
      dbM.onValue(R(`users/${uid}/friends`), s => { S.friends = s.val() || {}; watchFriends(); draw(); }),
      dbM.onValue(R(`requests/${uid}`), s => { S.requests = s.val() || {}; draw(); badge(); }),
      dbM.onValue(R(`invites/${uid}`), s => { const was = S.invites; S.invites = s.val() || {}; for (const k in S.invites) if (!was[k]) toast(k); draw(); badge(); }),
      net.onLobby(st => { if (me) dbM.update(pr, { room: st?.code || null }).catch(() => {}); }),
    );
    draw(); badge();
  } catch {}
}
function stopSocial() {
  S.unsubs.forEach(u => u()); S.unsubs = [];
  Object.values(S.fUnsubs).forEach(u => u()); S.fUnsubs = {};
  if (me) me.dbM.update(me.R('profiles/' + me.uid), { online: false, seen: me.dbM.serverTimestamp(), room: null }).catch(() => {});
  me = null; S.friends = {}; S.profiles = {}; S.requests = {}; S.invites = {};
  badge();
}
function watchFriends() {
  for (const fid of Object.keys(S.fUnsubs)) if (!S.friends[fid]) { S.fUnsubs[fid](); delete S.fUnsubs[fid]; delete S.profiles[fid]; }
  for (const fid of Object.keys(S.friends)) if (!S.fUnsubs[fid]) S.fUnsubs[fid] = me.dbM.onValue(me.R('profiles/' + fid), s => { S.profiles[fid] = s.val(); draw(); });
}
setUserChangeHook(() => { stopSocial(); startSocial(); });
startSocial();

export function publishCard() { if (me) me.dbM.update(me.R('profiles/' + me.uid), { name: cardData().name, card: cardData() }).catch(() => {}); }

async function addFriend() {
  const code = ($('frCode')?.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  fui = { err: '', msg: '', busy: true }; draw();
  try {
    if (code.length !== 6) throw new Error('Friend codes are 6 characters.');
    const s = await me.dbM.get(me.R('codes/' + code));
    if (!s.exists()) throw new Error('No player has that friend code.');
    const fid = s.val();
    if (fid === me.uid) throw new Error('That’s your own code!');
    await me.dbM.set(me.R(`users/${me.uid}/friends/${fid}`), { t: me.dbM.serverTimestamp() });
    await me.dbM.set(me.R(`requests/${fid}/${me.uid}`), { name: cardData().name, t: me.dbM.serverTimestamp() }).catch(() => {});
    if (S.requests[fid]) await me.dbM.remove(me.R(`requests/${me.uid}/${fid}`));
    fui.msg = 'Friend added! They’ll see a request to add you back.';
  } catch (e) { fui.err = e.message || 'Couldn’t add that friend.'; }
  fui.busy = false; draw();
}
async function friendAct(act, id) {
  const { dbM, R, uid } = me;
  if (act === 'accept') { await dbM.set(R(`users/${uid}/friends/${id}`), { t: dbM.serverTimestamp() }); await dbM.remove(R(`requests/${uid}/${id}`)); }
  if (act === 'ignore') await dbM.remove(R(`requests/${uid}/${id}`));
  if (act === 'remove') await dbM.remove(R(`users/${uid}/friends/${id}`));
  if (act === 'invite') {
    const room = net.lobbyState()?.code; if (!room) return;
    await dbM.set(R(`invites/${id}/${uid}`), { room, name: cardData().name, t: dbM.serverTimestamp() });
    fui = { err: '', msg: `Invite sent to ${S.profiles[id]?.name || 'your friend'}.`, busy: false };
  }
  if (act === 'join' || act === 'accinv') {
    const room = act === 'join' ? S.profiles[id]?.room : S.invites[id]?.room;
    if (act === 'accinv') await dbM.remove(R(`invites/${uid}/${id}`));
    if (room) { closeHub(); joinFriend(room); }
  }
  if (act === 'dropinv') await dbM.remove(R(`invites/${uid}/${id}`));
  if (act === 'card') return openCard(id);
  draw();
}
function friendsHTML() {
  if (!myAccount()) return `<p class="hb-empty">Friends need an account so they can find you. Create one or log in on the <button class="ac-link" data-tab="account">Account</button> tab.</p>`;
  if (!me) return '<p class="hb-empty">Connecting…</p>';
  const inRoom = !!net.lobbyState();
  const req = Object.entries(S.requests), inv = Object.entries(S.invites);
  const rows = Object.keys(S.friends).map(id => ({ id, p: S.profiles[id] })).sort((a, b) => (b.p?.online ? 1 : 0) - (a.p?.online ? 1 : 0) || (a.p?.name || '').localeCompare(b.p?.name || ''));
  const fr = ({ id, p }) => {
    const h = HEROES.find(x => x.id === p?.card?.main?.id) || HEROES[0];
    const status = !p ? 'Loading…' : p.online ? (p.room ? 'Online · in a room' : 'Online') : p.seen ? `Last seen ${ago(p.seen)}` : 'Offline';
    return `<div class="fr ${p?.online ? 'on' : ''}" style="--hc:${hex(h.color)}"><img src="${headshot(h)}" alt=""><div><b>${esc(p?.name || 'Player')}</b><small><i></i>${status}</small></div>
      <div class="fr-b"><button class="ghost" data-fr="card" data-id="${id}">Card</button>
      ${p?.online && p.room ? `<button class="ghost go" data-fr="join" data-id="${id}">Join</button>` : ''}
      ${p?.online && inRoom && !p.room ? `<button class="ghost go" data-fr="invite" data-id="${id}">Invite</button>` : ''}
      <button class="ghost x" data-fr="remove" data-id="${id}" title="Remove friend">✕</button></div></div>`;
  };
  return `<div class="fr-code"><div><small>Your friend code</small><b>${me.code || '…'}</b></div><button class="ghost" data-fr="copy">Copy</button></div>
    <div class="fr-add"><input id="frCode" maxlength="6" placeholder="Friend’s code" spellcheck="false" autocomplete="off"><button class="bigbtn alt" data-fr="add" ${fui.busy ? 'disabled' : ''}>Add</button></div>
    ${fui.err ? `<div class="ac-err">${esc(fui.err)}</div>` : ''}${fui.msg ? `<div class="ac-msg">${esc(fui.msg)}</div>` : ''}
    ${inv.length ? `<h4 class="hb-h">Room invites</h4>${inv.map(([id, v]) => `<div class="fr inv"><span class="fr-i">🎮</span><div><b>${esc(v.name || 'A friend')}</b><small>invited you to room ${esc(v.room)}</small></div><div class="fr-b"><button class="ghost go" data-fr="accinv" data-id="${id}">Join</button><button class="ghost x" data-fr="dropinv" data-id="${id}">✕</button></div></div>`).join('')}` : ''}
    ${req.length ? `<h4 class="hb-h">Added you</h4>${req.map(([id, v]) => `<div class="fr inv"><span class="fr-i">👋</span><div><b>${esc(v.name || 'Player')}</b><small>added you as a friend</small></div><div class="fr-b"><button class="ghost go" data-fr="accept" data-id="${id}">Add back</button><button class="ghost x" data-fr="ignore" data-id="${id}">✕</button></div></div>`).join('')}` : ''}
    <h4 class="hb-h">Friends <small>${rows.filter(r => r.p?.online).length} online</small></h4>
    ${rows.length ? rows.map(fr).join('') : '<p class="hb-empty">No friends yet. Share your code, or add theirs above.</p>'}
    ${inRoom ? '' : '<p class="ac-note">Open a room in Online to invite friends into it.</p>'}`;
}
// the 👤 button shows a dot when you have requests or invites waiting
function badge() { const n = Object.keys(S.requests).length + Object.keys(S.invites).length, b = $('modeAccount')?.querySelector('i'); if (!b) return; b.textContent = n || '✓'; $('modeAccount').classList.toggle('alert', n > 0); }
function toast(from) {
  const v = S.invites[from]; if (!v) return;
  const el = document.createElement('div'); el.className = 'fr-toast';
  el.innerHTML = `<span>🎮</span><div><b>${esc(v.name || 'A friend')}</b> invited you to their room</div><button class="ghost go">Join</button><button class="ghost x">✕</button>`;
  el.querySelector('.go').onclick = () => { el.remove(); friendAct('accinv', from); };
  el.querySelector('.x').onclick = () => el.remove();
  document.body.append(el); setTimeout(() => el.remove(), 15000);
}

// ---------- someone else's card ----------
let viewing = null;                  // { uid, data } while looking at another player's card
export async function openCard(uid) {
  openHub('card'); viewing = { uid, data: undefined }; draw();
  try {
    const F = await loadFirebase(), s = await F.dbM.get(F.dbM.ref(F.db, 'profiles/' + uid));
    viewing = { uid, data: s.exists() ? s.val() : null };
  } catch { viewing = { uid, data: null }; }
  draw();
}
document.addEventListener('smx-card', e => openCard(e.detail));       // the online lobby asks for a player's card

// ---------- the screen ----------
let tab = 'profile';
const TABS = [['profile', 'Profile'], ['history', 'History'], ['friends', 'Friends'], ['account', 'Account']];
function draw() {
  const el = $('account'); if (!el || el.classList.contains('hidden')) return;
  if (accountBusy()) tab = 'account';
  const keep = { e: $('acEmail')?.value, p: $('acPass')?.value, c: $('frCode')?.value };
  let body;
  if (tab === 'card') {
    const v = viewing;
    body = `<button class="ac-link back" data-tab="friends">← Back</button>` + (v?.data === undefined ? '<p class="hb-empty">Loading card…</p>'
      : v?.data?.card ? cardHTML(v.data.card, `<p class="pc-foot">${v.data.online ? '🟢 Online now' : v.data.seen ? `Last seen ${ago(v.data.seen)}` : ''}</p>`)
      : '<p class="hb-empty">This player doesn’t have a profile card yet. Cards come with an account.</p>');
  } else if (tab === 'profile') body = cardHTML(cardData(), `<p class="pc-foot">${myAccount() ? 'Friends can see this card.' : 'Log in on the Account tab to share your card with friends.'}</p>`);
  else if (tab === 'history') body = historyHTML();
  else if (tab === 'friends') body = friendsHTML();
  else body = accountHTML();
  const n = Object.keys(S.requests).length + Object.keys(S.invites).length;
  el.querySelector('.hb-tabs').innerHTML = TABS.map(([id, l]) => `<button class="${tab === id || (tab === 'card' && id === 'friends') ? 'on' : ''}" data-tab="${id}">${l}${id === 'friends' && n ? ` <i>${n}</i>` : ''}</button>`).join('');
  el.querySelector('.ac-body').innerHTML = body;
  if (keep.e && $('acEmail')) $('acEmail').value = keep.e;
  if (keep.p && $('acPass')) $('acPass').value = keep.p;
  if (keep.c && $('frCode')) $('frCode').value = keep.c;
}
setAccountRedraw(draw);

export function openHub(start) {
  let el = $('account');
  if (!el) {
    el = document.createElement('div'); el.id = 'account'; el.className = 'hidden';
    el.innerHTML = `<div class="acsheet hub"><header><div><small>SuperMaxx</small><h2>Profile</h2></div><button class="ghost" data-close>Close</button></header>
      <nav class="hb-tabs"></nav><div class="ac-body"></div></div>`;
    document.body.append(el);
    el.addEventListener('click', e => {
      if (e.target === el || e.target.closest('[data-close]')) return closeHub();
      const t = e.target.closest('[data-tab]'); if (t && !accountBusy()) { tab = t.dataset.tab; fui.err = fui.msg = ''; draw(); return; }
      const fr = e.target.closest('[data-fr]');
      if (fr && me) {
        if (fr.dataset.fr === 'add') return addFriend();
        if (fr.dataset.fr === 'copy') { navigator.clipboard?.writeText(me.code || ''); fr.textContent = 'Copied!'; setTimeout(() => { fr.textContent = 'Copy'; }, 1200); return; }
        return friendAct(fr.dataset.fr, fr.dataset.id).catch(() => { fui.err = 'That didn’t go through. Try again.'; draw(); });
      }
      const ac = e.target.closest('[data-ac]'); if (ac) accountAct(ac.dataset.ac);
    });
    el.addEventListener('keydown', e => {
      e.stopPropagation();                                      // typing here shouldn't steer the menus behind
      if (e.key === 'Escape') return closeHub();
      if (e.key === 'Enter' && e.target.id === 'frCode') return addFriend();
      if (e.key === 'Enter' && e.target.tagName === 'INPUT') accountEnter();
    });
    el.addEventListener('input', e => { if (e.target.id === 'frCode') e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
  }
  if (start) tab = start;
  accountOpened(); fui.err = fui.msg = '';
  el.classList.remove('hidden');
  draw();
  if (tab === 'account' && !myAccount()) $('acEmail')?.focus();
}
export function closeHub() { if (accountBusy()) return; $('account')?.classList.add('hidden'); }
