import { HEROES } from './heroes.js?v=20261126a';
import { MAPS } from './data.js?v=20261126a';
import { cfg, save } from './settings.js?v=20261126a';
import { headshot } from './portraits.js?v=20261126a';
import { dressed, wear, myCosIds, resolveCos, bannerCss } from './pass.js?v=20261126a';
import * as net from './net.js?v=20261126a';

// Online front end: set up your name and hero, host or join a room by code, then the lobby
// (mode, teams, stage, start). The match itself starts on every machine when the host hits Start.

const $ = id => document.getElementById(id);
const hex = c => '#' + c.toString(16).padStart(6, '0');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
let api = null, err = '', busy = false, nameT = 0;
const MODES = { hill: { name: 'Hill Rush', sub: '3v3 · bots fill gaps', per: 3 }, duel: { name: 'Duel', sub: '1v1 · first to 3 rounds', per: 1 } };

const myDef = () => dressed(HEROES.find(h => h.id === cfg.hero) || HEROES[0]);
const profile = () => ({ name: (cfg.name || '').trim().slice(0, 16) || 'Player', hero: myDef().id, skin: myDef().skinId || '', cos: myCosIds() });

export function initOnline(opts) {
  api = opts;
  net.onLobby((st, extra) => { if (extra?.closed) err = extra.closed; if (api.screen() === 'online') render(); });
  net.onMatchStart(m => api.start(m));
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
  body.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter' && e.target.id === 'onCode') act('join'); });
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
  const focus = document.activeElement?.id, caret = document.activeElement?.selectionStart, code = $('onCode')?.value;
  if (!net.netConfigured()) body.innerHTML = setupHTML();
  else if (st) body.innerHTML = lobbyHTML(st);
  else body.innerHTML = homeHTML();
  if (code && $('onCode')) $('onCode').value = code;
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
  const d = myDef(), c = resolveCos(myCosIds());
  return `<div class="oncard me">
    <h3>You</h3>
    <label class="onlabel">Name<input id="onName" maxlength="16" value="${esc(cfg.name)}" placeholder="Player" autocomplete="off"></label>
    <div class="onhero" style="--hc:${hex(d.color)};${bannerCss(c.banner)}"><img src="${headshot(d)}" alt=""><div><small>Playing as</small><b>${d.callsign}</b>${d.skinName ? `<em>${esc(d.skinName)}</em>` : ''}
      ${c.title ? `<span class="ptitle">${esc(c.title)}</span>` : ''}</div>
      <button class="ghost" data-act="hero">Change</button></div>
  </div>`;
}

function homeHTML() {
  return `<div class="onwrap">
    ${meCard()}
    <div class="oncard">
      <h3>Host a room</h3>
      <p>Get a code to share with friends. Up to six players, 3v3 Hill Rush. Bots fill any empty slots.</p>
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
  const mode = st.meta?.mode === 'duel' ? 'duel' : 'hill', M = MODES[mode], duel = mode === 'duel';
  // in a duel the first two to join face off, whatever team they picked
  const sideOf = (uid, p) => duel ? (players.findIndex(([u]) => u === uid) === 0 ? 'blue' : 'red') : p.team;
  const col = team => {
    const list = players.filter(([uid, p]) => sideOf(uid, p) === team);
    const slots = list.map(([uid, p]) => {
      const base = HEROES.find(h => h.id === p.hero) || HEROES[0], d = wear(base, p.skin), c = resolveCos(p.cos);
      return `<div class="slot ${uid === st.me ? 'me' : ''} ${c.banner ? 'banner' : ''}" style="--hc:${hex(d.color)};${bannerCss(c.banner)}"><img src="${headshot(d)}" alt="">
        <div><b>${esc(p.name)}${uid === st.meta?.host ? ' <span class="crown" title="Host">♛</span>' : ''}</b><small>${base.callsign}</small>${c.title ? `<span class="ptitle">${esc(c.title)}</span>` : ''}</div></div>`;
    });
    for (let i = list.length; i < M.per; i++) slots.push('<div class="slot bot"><span>🤖</span><div><b>Bot</b><small>fills this slot</small></div></div>');
    const full = list.length >= M.per;
    return `<div class="teamcol ${team}"><h4>${team === 'blue' ? 'Blue' : 'Red'} ${duel ? 'corner' : 'team'} <span>${Math.min(list.length, M.per)}/${M.per}</span></h4>${slots.join('')}
      ${!duel && mine && mine.team !== team ? `<button class="ghost" data-act="team" data-v="${team}" ${full ? 'disabled' : ''}>${full ? 'Team full' : 'Join ' + team}</button>` : ''}</div>`;
  };
  const playing = st.meta?.state === 'playing';
  const tooMany = duel && players.length > 2;
  const bots = duel ? Math.max(0, 2 - players.length) : 6 - Math.min(6, players.length);
  return `<div class="lobby">
    <div class="codebox"><small>Room code</small><b>${st.code}</b><button class="ghost" id="onCopy" data-act="copy">Copy</button><span>Share it. Friends pick <i>Online → Join</i>.</span></div>
    <div class="modechips">${Object.entries(MODES).map(([id, m]) => st.host
      ? `<button class="${id === mode ? 'on' : ''}" data-act="mode" data-v="${id}" ${playing ? 'disabled' : ''}><b>${m.name}</b><small>${m.sub}</small></button>`
      : `<div class="${id === mode ? 'on' : 'off'}"><b>${m.name}</b><small>${m.sub}</small></div>`).join('')}</div>
    <div class="teams ${duel ? 'duel' : ''}">${col('blue')}<div class="vs">VS</div>${col('red')}</div>
    ${duel && players.length > 2 ? `<div class="spect">Watching: ${players.slice(2).map(([, p]) => esc(p.name)).join(', ')}. Only two can duel.</div>` : ''}
    <div class="lobbyfoot">
      ${meCard()}
      <div class="oncard stage">
        <h3>Stage</h3>
        ${st.host ? `<div class="mapchips">${MAPS.map(m => `<button class="${m.id === map.id ? 'on' : ''}" data-act="map" data-v="${m.id}" style="--ma:${hex(m.accent)}">${m.name}</button>`).join('')}</div>`
          : `<p><b>${map.name}</b><br>The host picks the stage.</p>`}
      </div>
      <div class="oncard go">
        ${st.host ? `<button class="bigbtn" data-act="start" ${playing || tooMany ? 'disabled' : ''}>Start ${M.name.toLowerCase()}</button>
          <p>${tooMany ? 'Duel is 1v1. Switch to Hill Rush or have extra players leave.' : `${Math.min(players.length, duel ? 2 : 6)} player${players.length > 1 ? 's' : ''} · ${bots} bot${bots === 1 ? '' : 's'}`}</p>`
          : `<div class="wait">${playing ? 'Match in progress…' : 'Waiting for the host to start'}</div>`}
        <button class="ghost" data-act="leave">Leave room</button>
      </div>
    </div>
    ${err ? `<div class="onmsg err">${esc(err)}</div>` : ''}
  </div>`;
}
