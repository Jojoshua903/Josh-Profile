import { HEROES, ARCHETYPES } from './heroes.js?v=20261128r';
import { MAPS, DIFFICULTY } from './data.js?v=20261128r';
import { cfg, save } from './settings.js?v=20261128r';
import { headshot } from './portraits.js?v=20261128r';
import { dressed, wear, myCosIds, heroOwned } from './pass.js?v=20261128r';
import * as net from './net.js?v=20261128r';

// Online front end: set up your name and hero, host or join a room by code, then the lobby
// (mode, teams, stage, start). The match itself starts on every machine when the host hits Start.

const $ = id => document.getElementById(id);
const hex = c => '#' + c.toString(16).padStart(6, '0');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
let api = null, err = '', busy = false, nameT = 0;
const MODES = { hill: { name: 'Hill Rush', sub: '3v3 · bots fill gaps', per: 3 }, lane: { name: 'Lane Breaker', sub: '3v3 · towers, cores and minions', per: 3 },
  duel: { name: 'Duel', sub: '1v1 · first to 3 rounds', per: 1 } };

const myDef = () => dressed(HEROES.find(h => h.id === cfg.hero) || HEROES[0]);
const profile = () => ({ name: (cfg.name || '').trim().slice(0, 16) || 'Player', hero: myDef().id, skin: myDef().skinId || '', cos: myCosIds() });

export function initOnline(opts) {
  api = opts;
  net.onLobby((st, extra) => { if (extra?.closed) err = extra.closed; if (api.screen() === 'online') render(); });
  net.onMatchStart(m => api.start(m));
  net.onChat(() => { if (api.screen() === 'online') renderChat(); });
  $('onBack').onclick = async () => { if (net.lobbyState()) await net.leaveRoom(); err = ''; api.go('main'); };
  const body = $('onBody');
  body.addEventListener('click', onClick);
  body.addEventListener('input', e => {
    if (e.target.id === 'onName') {
      cfg.name = e.target.value; save();
      clearTimeout(nameT); nameT = setTimeout(() => net.setProfile({ name: profile().name }), 400);
    }
    if (e.target.id === 'onCode') e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  });
  body.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter' && e.target.id === 'onCode') act('join'); if (e.key === 'Enter' && e.target.id === 'onChat') { e.preventDefault(); say(); } });
  body.addEventListener('change', e => { if (e.target.dataset.pick === 'map') act('map', e.target.value); });
}

export function enterOnline() {
  const st = net.lobbyState();
  if (st) {
    net.setProfile({ hero: profile().hero, skin: profile().skin, cos: profile().cos });   // back from the hero picker or pass
    if (st.host && st.meta?.state === 'playing') net.backToLobby();      // back from a finished match
  }
  render();
}

function onClick(e) { const b = e.target.closest('[data-act]'); if (b && !b.disabled) act(b.dataset.act, b.dataset.v); }

async function act(what, v) {
  const st = net.lobbyState();
  api.blip?.(what === 'start' ? 880 : 620);
  if (what === 'hero') return api.pickHero();
  if (what === 'say') return say();
  if (what === 'quick') return say(v);
  if (what === 'card') return document.dispatchEvent(new CustomEvent('smx-card', { detail: v }));
  if (what === 'create' || what === 'join') {
    const code = $('onCode')?.value || '';
    if (what === 'join' && code.length < 5) { err = 'Room codes are 5 characters'; return render(); }
    busy = true; err = ''; render();
    try { if (what === 'create') await net.createRoom(profile()); else await net.joinRoom(code, profile()); }
    catch (x) { err = net.explain(x).message || String(x); }
    busy = false; render();
    return;
  }
  if (!st) return;
  if (what === 'team') net.setProfile({ team: v });
  if (what === 'map') net.setMap(v);
  if (what === 'mode') net.setMode(v);
  if (what === 'drafttog') net.setDraft(!st.meta?.draft);
  if (what === 'botstog') net.setBots(!!st.meta?.noBots);
  if (what === 'botdiff') net.setBotDiff(v);
  if (what === 'draft') net.draftPick(v);
  if (what === 'start') net.startMatch().catch(x => { err = net.explain(x).message; render(); });
  if (what === 'leave') { await net.leaveRoom(); render(); }
  if (what === 'copy') navigator.clipboard?.writeText(st.code).then(() => { const b = $('onCopy'); if (b) { b.textContent = 'Copied!'; setTimeout(() => { b.textContent = 'Copy'; }, 1200); } }).catch(() => {});
}

function render() {
  const body = $('onBody');
  if (!body) return;
  const st = net.lobbyState();
  $('onTitle').textContent = st ? `Room ${st.code}` : 'Play with friends';
  // lobby updates re-render the panel; keep typing in the name or code box uninterrupted
  const focus = document.activeElement?.id, caret = document.activeElement?.selectionStart, code = $('onCode')?.value, chat = $('onChat')?.value;
  if (!net.netConfigured()) body.innerHTML = setupHTML();
  else if (st && st.meta?.state === 'draft' && st.draft) body.innerHTML = draftHTML(st);
  else if (st) body.innerHTML = lobbyHTML(st);
  else body.innerHTML = homeHTML();
  if (code && $('onCode')) $('onCode').value = code;
  if (chat && $('onChat')) $('onChat').value = chat;
  const log = $('onLog'); if (log) { log.scrollTop = log.scrollHeight; log.dataset.n = net.chatLog().length; }
  if (focus && $(focus)) { $(focus).focus(); try { $(focus).setSelectionRange(caret, caret); } catch {} }
}

function setupHTML() {
  return `<div class="onwrap one"><div class="oncard setup">
    <h3>Online play needs a Firebase project</h3>
    <p>Everything is built in. It just needs somewhere to meet. One-time setup, about ten minutes:</p>
    <ol>
      <li>Create a project at <b>console.firebase.google.com</b> and add a <b>Web app</b>.</li>
      <li>Turn on <b>Authentication → Sign-in method → Anonymous</b>.</li>
      <li>Create a <b>Realtime Database</b> and paste the rules from <code>database.rules.json</code>.</li>
      <li>Copy the web app config (with <code>databaseURL</code>) into <code>firebase-config.js</code>.</li>
      <li>Push the folder to GitHub and turn on <b>GitHub Pages</b>. Add your <code>github.io</code> domain under Authentication → Settings → Authorized domains.</li>
    </ol>
    <p class="fine">Full steps are in <code>ONLINE.md</code>. This in-browser preview can't reach Firebase, so online play runs on the hosted copy.</p>
  </div></div>`;
}

function meCard() {
  const d = myDef();
  return `<div class="oncard me">
    <h3>You</h3>
    <label class="onlabel">Name<input id="onName" maxlength="16" value="${esc(cfg.name)}" placeholder="Player" autocomplete="off"></label>
    <div class="onhero" style="--hc:${hex(d.color)}"><img src="${headshot(d)}" alt=""><div><small>Playing as</small><b>${d.callsign}</b>${d.skinName ? `<em>${esc(d.skinName)}</em>` : ''}</div>
      <button class="ghost" data-act="hero">Change</button></div>
  </div>`;
}

function homeHTML() {
  return `<div class="onwrap">
    ${meCard()}
    <div class="oncard">
      <h3>Host a room</h3>
      <p>Get a code to share with friends. Up to six players: 3v3 Hill Rush or Lane Breaker, with an optional draft, or a 1v1 Duel. Bots fill any empty slots.</p>
      <button class="bigbtn" data-act="create" ${busy ? 'disabled' : ''}>Create room</button>
    </div>
    <div class="oncard">
      <h3>Join a friend</h3>
      <p>Type the 5-letter code from the host's screen.</p>
      <input id="onCode" class="code" maxlength="5" placeholder="ABCDE" autocomplete="off" spellcheck="false">
      <button class="bigbtn alt" data-act="join" ${busy ? 'disabled' : ''}>Join room</button>
    </div>
    ${busy ? '<div class="onmsg">Connecting…</div>' : ''}
    ${err ? `<div class="onmsg err">${esc(err)}</div>` : ''}
  </div>`;
}

function lobbyHTML(st) {
  const players = Object.entries(st.players || {}).sort((a, b) => a[1].t - b[1].t);
  const mine = st.players?.[st.me];
  const map = MAPS.find(m => m.id === st.meta?.map) || MAPS[0];
  const mode = MODES[st.meta?.mode] ? st.meta.mode : 'hill', M = MODES[mode], duel = mode === 'duel';
  const playing = st.meta?.state === 'playing', host = st.host, lock = playing ? 'disabled' : '';
  // in a duel the first two to join face off, whatever team they picked
  const sideOf = (uid, p) => duel ? (players.findIndex(([u]) => u === uid) === 0 ? 'blue' : 'red') : p.team;
  const botsOn = !st.meta?.noBots, draft = !duel && !!st.meta?.draft, diff = st.meta?.botDiff || 'normal';
  const col = team => {
    const list = players.filter(([uid, p]) => sideOf(uid, p) === team), full = list.length >= M.per;
    const rows = list.map(([uid, p]) => {
      const base = HEROES.find(h => h.id === p.hero) || HEROES[0], d = wear(base, p.skin);
      return `<button class="rm-p ${uid === st.me ? 'me' : ''}" data-act="card" data-v="${uid}" title="See their player card" style="--hc:${hex(d.color)}">
        <img src="${headshot(d)}" alt=""><span><b>${esc(p.name)}</b><small>${base.callsign}</small></span>
        ${uid === st.meta?.host ? '<i class="rm-host" title="Host">♛ Host</i>' : uid === st.me ? '<i class="rm-you">You</i>' : ''}</button>`;
    });
    for (let i = list.length; i < M.per; i++) rows.push(botsOn ? '<div class="rm-p bot"><span class="rm-ic">🤖</span><span><b>Bot</b><small>fills this seat</small></span></div>'
      : '<div class="rm-p empty"><span class="rm-ic">·</span><span><b>Open seat</b><small>bots are off</small></span></div>');
    const join = !duel && mine && mine.team !== team ? `<button class="rm-join" data-act="team" data-v="${team}" ${full ? 'disabled' : ''}>${full ? 'Full' : 'Switch here'}</button>` : '';
    return `<div class="rm-team ${team}"><header><b>${team === 'blue' ? 'Blue' : 'Red'} ${duel ? 'corner' : 'team'}</b><span>${Math.min(list.length, M.per)}/${M.per}</span>${join}</header>${rows.join('')}</div>`;
  };
  const tooMany = duel && players.length > 2;
  const bots = !botsOn ? 0 : duel ? Math.max(0, 2 - players.length) : 6 - Math.min(6, players.length);
  const short = botsOn ? '' : duel ? (players.length < 2 ? 'Bots are off: you need a second player to duel.' : '')
    : ['blue', 'red'].find(t => !players.some(([uid, p]) => sideOf(uid, p) === t)) ? 'Bots are off: each team needs at least one player.' : '';
  // a settings row: the host gets controls, everyone else sees the current choice
  const seg = (act, opts, cur) => `<div class="rm-seg">${opts.map(([v, l]) => host
    ? `<button class="${v === cur ? 'on' : ''}" data-act="${act}" data-v="${v}" ${lock}>${l}</button>`
    : `<span class="${v === cur ? 'on' : ''}">${l}</span>`).join('')}</div>`;
  const tog = (act, on) => host ? `<button class="rm-tog ${on ? 'on' : ''}" data-act="${act}" ${lock}><i></i></button>` : `<span class="rm-tog ${on ? 'on' : ''}"><i></i></span>`;
  const d = myDef();
  return `<div class="rm">
    <div class="rm-head">
      <div class="rm-code"><small>Room code</small><b>${st.code}</b><button class="ghost" id="onCopy" data-act="copy">Copy</button></div>
      <div class="rm-sum"><b>${M.name}</b><span>${map.name} · ${players.length} player${players.length === 1 ? '' : 's'}${bots ? ` + ${bots} bot${bots === 1 ? '' : 's'}` : ''}${draft ? ' · draft' : ''}</span></div>
      <div class="rm-state ${playing ? 'live' : ''}">${playing ? '● Match in progress' : host ? 'You’re the host' : 'Waiting for the host'}</div>
    </div>
    <div class="rm-grid">
      <div class="rm-main">
        <div class="rm-teams ${duel ? 'duel' : ''}">${col('blue')}<div class="rm-vs">VS</div>${col('red')}</div>
        ${duel && players.length > 2 ? `<div class="rm-note">Watching: ${players.slice(2).map(([, p]) => esc(p.name)).join(', ')}. Only two can duel.</div>` : ''}
        <div class="rm-chat">
          <header><b>💬 Room chat</b><small>Only people in this room can see it</small></header>
          <div class="rm-log" id="onLog">${chatRows(st)}</div>
          <div class="rm-say"><input id="onChat" maxlength="${net.CHAT.max}" placeholder="Say something…" autocomplete="off" spellcheck="true"><button data-act="say">Send</button></div>
          <div class="rm-quick">${QUICK.map(q => `<button data-act="quick" data-v="${esc(q)}">${q}</button>`).join('')}</div>
        </div>
      </div>
      <aside class="rm-side">
        <section class="rm-card">
          <h4>Match ${host ? '' : '<small>set by the host</small>'}</h4>
          <label>Mode</label>${seg('mode', Object.entries(MODES).map(([id, m]) => [id, m.name]), mode)}
          <label>Stage</label>${host ? `<select class="rm-sel" data-pick="map" ${lock}>${MAPS.map(m => `<option value="${m.id}" ${m.id === map.id ? 'selected' : ''}>${m.name}</option>`).join('')}</select>` : `<div class="rm-val">${map.name}</div>`}
          ${duel ? '' : `<div class="rm-row"><span><b>Draft pick</b><small>Take turns picking, no duplicates</small></span>${tog('drafttog', draft)}</div>`}
          <div class="rm-row"><span><b>Bots</b><small>${botsOn ? 'Fill any empty seats' : 'Players only'}</small></span>${tog('botstog', botsOn)}</div>
          ${botsOn ? `<label>Bot skill</label>${seg('botdiff', Object.entries(DIFFICULTY).map(([k, x]) => [k, x.label]), diff)}` : ''}
        </section>
        <section class="rm-card rm-me" style="--hc:${hex(d.color)}">
          <h4>You</h4>
          <label class="rm-name">Name<input id="onName" maxlength="16" value="${esc(cfg.name)}" placeholder="Player" autocomplete="off"></label>
          <button class="rm-hero" data-act="hero"><img src="${headshot(d)}" alt=""><span><small>Playing as</small><b>${d.callsign}</b>${d.skinName ? `<em>${esc(d.skinName)}</em>` : ''}</span><i>Change</i></button>
        </section>
        <section class="rm-go">
          ${host ? `<button class="bigbtn" data-act="start" ${playing || tooMany || short ? 'disabled' : ''}>${draft ? 'Start draft ▸' : `Start ${M.name} ▸`}</button>
            <p>${tooMany ? 'Duel is 1v1. Switch mode or have extra players leave.' : short || 'Everyone in the room joins the match.'}</p>`
            : `<div class="rm-wait">${playing ? 'Match in progress…' : '<i></i><i></i><i></i> Waiting for the host to start'}</div>`}
          <button class="ghost rm-leave" data-act="leave">Leave room</button>
        </section>
      </aside>
    </div>
    ${err ? `<div class="onmsg err">${esc(err)}</div>` : ''}
  </div>`;
}

// ---------- chat ----------
const QUICK = ['Ready!', 'gg', 'One more?', 'Brb', 'Swap teams?', 'Bots on?'];
const hhmm = t => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
function chatRows(st) {
  const log = net.chatLog();
  if (!log.length) return '<p class="rm-empty">No messages yet. Say hi! 👋</p>';
  return log.map(m => {
    if (m.sys) return `<div class="rm-msg sys"><b>${esc(m.name)}</b> ${esc(m.text)}</div>`;
    const p = st.players?.[m.uid], h = p && HEROES.find(x => x.id === p.hero), me = m.uid === st.me;
    return `<div class="rm-msg ${me ? 'me' : ''} ${p?.team || ''}" style="--hc:${h ? hex(h.color) : '#8a90a8'}"><b>${esc(m.name)}${m.uid === st.meta?.host ? ' ♛' : ''}</b><time>${hhmm(m.t)}</time><p>${esc(m.text)}</p></div>`;
  }).join('');
}
// redraw just the log (new messages shouldn't disturb what you're typing)
function renderChat() {
  const el = $('onLog'), st = net.lobbyState(); if (!el || !st) return;
  const atEnd = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  el.innerHTML = chatRows(st);
  if (atEnd || el.dataset.n !== String(net.chatLog().length)) el.scrollTop = el.scrollHeight;
  el.dataset.n = net.chatLog().length;
}
function say(text) {
  const inp = $('onChat');
  if (!net.sendChat(text ?? inp?.value)) { inp?.classList.add('shake'); setTimeout(() => inp?.classList.remove('shake'), 300); return; }
  if (text == null && inp) inp.value = '';
  api.blip?.(990);
}

// ---------- draft ----------
// Heroes grouped by class; you can only take ones you own that nobody has picked yet.
const BY_CLASS = ARCHETYPES.flatMap(a => HEROES.filter(h => h.arch === a.id));
function draftHTML(st) {
  const D = st.draft, picks = D.picks || {}, done = D.turn >= D.order.length, cur = D.order[D.turn], mine = !done && cur === st.me;
  const slotOf = k => D.slots.find(s => s.key === k);
  const who = s => !s ? '' : s.uid ? esc(st.players?.[s.uid]?.name || s.name || 'Player') : 'Bot';
  const col = team => `<div class="teamcol ${team}"><h4>${team === 'blue' ? 'Blue' : 'Red'} team</h4>${D.slots.filter(s => s.team === team).map(s => {
    const h = HEROES.find(x => x.id === picks[s.key]), now = s.key === cur && !done, n = D.order.indexOf(s.key) + 1;
    return `<div class="slot dr ${s.uid === st.me ? 'me' : ''} ${now ? 'now' : ''} ${h ? '' : 'empty'}" style="--hc:${h ? hex(h.color) : '#c8c0b0'}">
      ${h ? `<img src="${headshot(h)}" alt="">` : `<span>${now ? '⏳' : s.uid ? '👤' : '🤖'}</span>`}
      <div><b>${who(s)}</b><small>${h ? h.callsign : now ? 'picking…' : `pick ${n}`}</small></div></div>`;
  }).join('')}</div>`;
  const taken = new Set(Object.values(picks));
  const grid = BY_CLASS.map(h => {
    const own = heroOwned(h.id), t = taken.has(h.id);
    return `<button class="dr-h ${t ? 'taken' : ''} ${own ? '' : 'locked'}" data-act="draft" data-v="${h.id}" ${!mine || t || !own ? 'disabled' : ''} style="--hc:${hex(h.color)}" title="${h.callsign} · ${h.role}">
      <img src="${headshot(h)}" alt=""><b>${h.callsign}</b>${t ? '<i>Taken</i>' : !own ? '<i>🔒</i>' : ''}</button>`;
  }).join('');
  const head = done ? 'Draft complete · starting the match…' : mine ? 'Your pick!' : `${who(slotOf(cur))} is picking`;
  return `<div class="lobby draft">
    <div class="dr-top ${mine ? 'mine' : ''}"><small>Draft · pick ${Math.min(D.turn + 1, D.order.length)} of ${D.order.length}</small><b>${head}</b><span id="drClock">${done ? '' : clockText(D)}</span></div>
    <div class="teams">${col('blue')}<div class="vs">VS</div>${col('red')}</div>
    <div class="dr-grid">${grid}</div>
    <p class="dr-note">${mine ? 'Click a hero to lock them in. If time runs out you get a random one.' : 'Heroes can only be picked once. Locked heroes need unlocking first.'}</p>
    <button class="ghost" data-act="leave">Leave room</button>
  </div>`;
}
const clockText = D => `${Math.max(0, Math.ceil((D.until - Date.now()) / 1000))}s`;
// tick the countdown, and pick a random hero for us if our time runs out
let autoFor = -1;
setInterval(() => {
  const st = net.lobbyState(), D = st?.draft;
  if (!D || st.meta?.state !== 'draft' || D.turn >= D.order.length) return;
  const c = $('drClock'); if (c) c.textContent = clockText(D);
  if (D.order[D.turn] === st.me && Date.now() > D.until && autoFor !== D.turn) {
    autoFor = D.turn;
    const free = net.draftFree(D), mine = free.filter(h => heroOwned(h.id)), from = mine.length ? mine : free;
    net.draftPick(from[Math.floor(Math.random() * from.length)].id);
  }
}, 250);

// A friend's invite or "Join" button: leave any room we're in and join theirs.
export async function joinFriend(code) {
  if (net.lobbyState()) await net.leaveRoom();
  api.go('online');
  busy = true; err = ''; render();
  try { await net.joinRoom(code, profile()); }
  catch (x) { err = net.explain(x).message || String(x); }
  busy = false; render();
}
