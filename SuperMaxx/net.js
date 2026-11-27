import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { FIREBASE_CONFIG } from './firebase-config.js?v=20261128w';
import { loadFirebase, setUserChangeHook } from './account.js?v=20261128w';
import { HEROES } from './heroes.js?v=20261128w';
import { damage, remoteKill, netShoot, spawnHero, setBar, tickCorpse, spawnMinion, unitDown, tracer, chestOf, TEAM_COLOR } from './units.js?v=20261128w';
import { replayCast } from './abilities.js?v=20261128w';
import { netHill } from './hill.js?v=20261128w';
import { poseHero } from './anim.js?v=20261128w';

// Online play over Firebase Realtime Database.
//
// Layout:  rooms/{CODE}/meta      host, state (lobby|playing), map, match number, roster
//          rooms/{CODE}/players   one entry per connected player (name, hero, skin, team)
//          rooms/{CODE}/match/{n}/heroes/{key}  15 Hz snapshot written by whoever owns that hero
//          rooms/{CODE}/match/{n}/ev/{push}     batched events: shots, casts, hits, kills
//          rooms/{CODE}/match/{n}/hill          hill state, written by the host
//          rooms/{CODE}/match/{n}/lane          Lane Breaker: structure health and every minion, written by the host
//          rooms/{CODE}/draft     draft pick order, whose turn it is and the picks so far
//
// Ownership: each player simulates their own hero; the host also simulates the bots.
// Everyone replays everyone else's shots and casts so effects look and push the same, but
// damage only counts on the shooter's machine, which reports it to the target's owner.

let fb = null;
export const netConfigured = () => !!(FIREBASE_CONFIG && FIREBASE_CONFIG.databaseURL);
export const myUid = () => fb?.uid;

export async function connect() {
  if (fb) return fb;
  if (!netConfigured()) throw Object.assign(new Error('Online play is not set up yet'), { code: 'not-configured' });
  const F = await loadFirebase();
  // signed in to an account: play as it; otherwise a throwaway guest login
  let user = F.auth.currentUser;
  if (!user) { try { user = (await F.authM.signInAnonymously(F.auth)).user; } catch (e) { throw explain(e); } }
  fb = { db: F.db, uid: user.uid, f: F.dbM };
  return fb;
}
// signing in or out changes who we are online; pick it up on the next connect
setUserChangeHook(() => { if (!room) fb = null; });

// Turn Firebase's error codes into the console step that fixes them.
const FIXES = {
  'auth/invalid-api-key': 'The API key in firebase-config.js is wrong. Copy apiKey again from Project settings → Your apps.',
  'auth/api-key-not-valid': 'The API key in firebase-config.js is wrong. Copy apiKey again from Project settings → Your apps.',
  'auth/operation-not-allowed': 'Anonymous sign-in is off. Firebase console → Authentication → Sign-in method → Anonymous → Enable.',
  'auth/admin-restricted-operation': 'Anonymous sign-in is off. Firebase console → Authentication → Sign-in method → Anonymous → Enable.',
  'auth/configuration-not-found': 'Authentication isn\'t set up. Firebase console → Authentication → Get started, then enable Anonymous.',
  'auth/unauthorized-domain': `This site isn't allowed yet. Firebase console → Authentication → Settings → Authorized domains → add ${location.hostname}.`,
  'auth/requests-from-referer-are-blocked': `The API key blocks this site. Google Cloud console → Credentials → your Browser key → allow ${location.hostname}.`,
  'auth/network-request-failed': 'Could not reach Firebase. Check your connection or any ad/tracker blocker.',
};
export function explain(e) {
  const code = e?.code || '', msg = String(e?.message || e);
  if (FIXES[code]) return Object.assign(new Error(FIXES[code]), { code });
  if (/PERMISSION_DENIED|permission_denied/i.test(code + msg)) return Object.assign(new Error('The database refused the write. Paste database.rules.json into Realtime Database → Rules and press Publish.'), { code: 'rules' });
  return e;
}

// ---------- rooms & lobby ----------
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const genCode = () => Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
let room = null;
const lobbyCbs = new Set(), startCbs = new Set();
export const onLobby = cb => { lobbyCbs.add(cb); return () => lobbyCbs.delete(cb); };
export const onMatchStart = cb => { startCbs.add(cb); return () => startCbs.delete(cb); };
export function lobbyState() {
  if (!room) return null;
  return { code: room.code, meta: room.meta, players: room.players, draft: room.draft, me: fb.uid, host: room.meta?.host === fb.uid };
}
const emit = extra => lobbyCbs.forEach(cb => cb(lobbyState(), extra));
const R = path => fb.f.ref(fb.db, `rooms/${room.code}${path ? '/' + path : ''}`);
export const teamCount = (players, team) => Object.values(players || {}).filter(p => p.team === team).length;

export async function createRoom(profile) {
  await connect();
  const { f } = fb;
  let code = genCode();
  for (let i = 0; i < 6; i++) { if (!(await f.get(f.ref(fb.db, `rooms/${code}/meta`))).exists()) break; code = genCode(); }
  await f.set(f.ref(fb.db, 'rooms/' + code), {
    meta: { host: fb.uid, state: 'lobby', mode: 'hill', map: 'plaza', match: 0, created: f.serverTimestamp() },
    players: { [fb.uid]: { ...profile, team: 'blue', t: Date.now() } },
  });
  await enter(code, true); sendChat("opened the room", true, profile.name);
  return code;
}

export async function joinRoom(code, profile) {
  await connect();
  const { f } = fb;
  code = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const s = await f.get(f.ref(fb.db, 'rooms/' + code));
  if (!s.exists() || !s.val().meta) throw new Error('No room with that code');
  const v = s.val(), players = v.players || {};
  if (!players[fb.uid] && Object.keys(players).length >= 6) throw new Error('That room is full (6 players)');
  const dsz = v.meta.duelSize || 1;
  if (!players[fb.uid] && v.meta.mode === 'duel' && Object.keys(players).length >= dsz * 2) throw new Error(`That room is set to a ${dsz}v${dsz} Duel and it’s full`);
  if (v.meta.state === 'playing' || v.meta.state === 'draft') throw new Error(v.meta.state === 'draft' ? 'They’re drafting right now. Try again when the match ends' : 'A match is in progress there. Try again when it ends');
  const team = teamCount(players, 'blue') <= teamCount(players, 'red') ? 'blue' : 'red';
  await f.set(f.ref(fb.db, `rooms/${code}/players/${fb.uid}`), { ...profile, team, t: Date.now() });
  await enter(code, false); if (!players[fb.uid]) sendChat("joined", true, profile.name);
  return code;
}

async function enter(code, isHost) {
  const { f } = fb;
  room = { code, meta: null, players: {}, unsubs: [], started: 0, chat: [] };
  f.onDisconnect(R('players/' + fb.uid)).remove();
  if (isHost) f.onDisconnect(R('')).remove();                 // no host migration yet: host leaving closes the room
  room.unsubs.push(f.onValue(R('meta'), s => {
    if (!room) return;
    if (!s.exists()) { closeLocal('The host closed the room'); return; }
    room.meta = s.val();
    if (room.meta.state === 'playing' && room.meta.match !== room.started) {
      room.started = room.meta.match;
      startCbs.forEach(cb => cb({ roster: Object.values(room.meta.roster || {}), map: room.meta.map, match: room.meta.match, mode: room.meta.mode || 'hill', diff: room.meta.botDiff || 'normal' }));
    }
    emit();
  }));
  room.unsubs.push(f.onValue(R('players'), s => { if (!room) return; room.players = s.val() || {}; emit(); }));
  room.unsubs.push(f.onValue(R('draft'), s => { if (!room) return; room.draft = s.val(); emit(); hostDraft(); }));
  // room chat: the last few dozen messages, newest last
  room.unsubs.push(f.onChildAdded(f.query(R('chat'), f.limitToLast(CHAT.keep)), s => {
    if (!room) return;
    const m = s.val(); if (!m || typeof m.x !== 'string') return;
    room.chat.push({ id: s.key, uid: m.u, name: String(m.n || 'Player').slice(0, 16), text: m.x.slice(0, CHAT.max), t: m.t || Date.now(), sys: !!m.s });
    if (room.chat.length > CHAT.keep) room.chat.shift();
    chatCbs.forEach(cb => cb(room.chat));
  }));
  if (isHost) { const t = setInterval(hostDraft, 400); room.unsubs.push(() => clearInterval(t)); }   // bot picks and timeouts
}

function closeLocal(reason) {
  if (!room) return;
  room.unsubs.forEach(u => u());
  room = null;
  emit({ closed: reason });
}

export async function leaveRoom() {
  if (!room) return;
  if (room.meta?.host !== fb.uid) sendChat("left", true);
  const { f } = fb, code = room.code, host = room.meta?.host === fb.uid;
  room.unsubs.forEach(u => u());
  room = null; emit();
  try {
    await f.remove(f.ref(fb.db, host ? `rooms/${code}` : `rooms/${code}/players/${fb.uid}`));
  } catch {}
}

export function setProfile(patch) { if (room) fb.f.update(R('players/' + fb.uid), patch).catch(() => {}); }

// ---------- room chat ----------
export const CHAT = { max: 140, keep: 40, gap: 700 };
const chatCbs = new Set();
let lastSent = 0;
export const onChat = cb => { chatCbs.add(cb); return () => chatCbs.delete(cb); };
export const chatLog = () => room?.chat || [];
// Returns false if there was nothing to send or you're sending too fast.
export function sendChat(text, sys = false, name) {
  if (!room) return false;
  const x = String(text || '').replace(/\s+/g, ' ').trim().slice(0, CHAT.max);
  if (!x || (!sys && Date.now() - lastSent < CHAT.gap)) return false;
  if (!sys) lastSent = Date.now();
  const me = room.players?.[fb.uid];
  fb.f.push(R('chat'), { u: fb.uid, n: (name || me?.name || 'Player').slice(0, 16), x, t: Date.now(), ...(sys ? { s: 1 } : {}) }).catch(() => {});
  return true;
}
export function setMap(map) { if (room && lobbyState().host) fb.f.update(R('meta'), { map }).catch(() => {}); }
export function setMode(mode) { if (room && lobbyState().host) fb.f.update(R('meta'), { mode }).catch(() => {}); }
export function backToLobby() { if (room && lobbyState().host) fb.f.update(R('meta'), { state: 'lobby' }).catch(() => {}); }
export function setDraft(on) { if (room && lobbyState().host) fb.f.update(R('meta'), { draft: !!on }).catch(() => {}); }
export function setBots(on) { if (room && lobbyState().host) fb.f.update(R('meta'), { noBots: !on }).catch(() => {}); }
export function setDuelSize(n) { if (room && lobbyState().host && [1, 2, 3].includes(n)) fb.f.update(R('meta'), { duelSize: n }).catch(() => {}); }
export function setBotDiff(d) { if (room && lobbyState().host) fb.f.update(R('meta'), { botDiff: d }).catch(() => {}); }

// Who sits where: the first three of each team who joined, bots in the empty seats (unless the host
// switched bots off, then empty seats stay empty and each side needs at least one player).
// A 1v1 Duel is the first two players, one per side (a bot if you're alone). A 2v2 or 3v3 Duel
// uses the teams people picked, like the other modes.
function seats() {
  const duel = room.meta.mode === 'duel', noBots = !!room.meta.noBots, per = duel ? room.meta.duelSize || 1 : 3;
  const players = Object.entries(room.players).sort((a, b) => a[1].t - b[1].t);
  if (duel && players.length > per * 2) throw new Error(`This Duel is ${per}v${per}: only ${per * 2} players can play`);
  const human = (uid, p, team) => ({ key: uid, uid, name: p.name || 'Player', team, skin: p.skin || '', cos: p.cos || {}, want: p.hero });
  const bot = (team, i) => ({ key: `bot-${team}-${i}`, uid: '', name: '', team, skin: '' });
  const out = [];
  if (duel && per === 1) {
    players.forEach(([uid, p], i) => out.push(human(uid, p, i ? 'red' : 'blue')));
    if (out.length < 2) { if (noBots) throw new Error('Bots are off: you need a second player to duel'); out.push(bot('red', 0)); }
  } else for (const team of ['blue', 'red']) {
    const humans = players.filter(([, p]) => p.team === team).slice(0, per);
    for (const [uid, p] of humans) out.push(human(uid, p, team));
    if (noBots && !humans.length) throw new Error(`Bots are off: the ${team} team needs at least one player`);
    if (!noBots) for (let i = humans.length; i < per; i++) out.push(bot(team, i));
  }
  return out;
}
const seatOut = ({ want, ...s }, hero, skin) => ({ ...s, hero, skin: skin ?? s.skin });

// Host: lock in teams and start everyone at once, or open the draft first if it's switched on.
export async function startMatch() {
  if (!room || !lobbyState().host) return;
  const slots = seats();
  if (room.meta.mode !== 'duel' && room.meta.draft) return beginDraft(slots);
  // bots take heroes nobody in the room picked, each one different
  const taken = new Set(slots.filter(s => s.uid).map(s => s.want));
  const pool = HEROES.filter(h => !taken.has(h.id)).sort(() => Math.random() - 0.5);
  await launch(slots.map(s => seatOut(s, s.uid ? s.want : pool.pop().id)));
}
async function launch(roster) {
  const match = (room.meta.match || 0) + 1;
  await fb.f.remove(R('match'));
  await fb.f.update(R('meta'), { state: 'playing', match, roster });
}

// ---------- draft (3v3 only) ----------
// Two phases. Bans first: every seat bans one hero, alternating blue, red, blue... Then picks, snake
// order: blue 1, red 1 and 2, blue 2 and 3, red 3. A banned hero can't be picked, and every hero can
// only be picked once. Players write their own ban or pick; the host checks it, chooses for bots
// (and anyone who runs out of time) and moves the turn on. When the last pick is in, the match starts.
export const DRAFT_PICK_S = 20, DRAFT_BAN_S = 15;
const BOT_PICK_MS = 1600, GRACE_MS = 2500;
async function beginDraft(slots) {
  const B = slots.filter(s => s.team === 'blue'), Rd = slots.filter(s => s.team === 'red');
  const bans = [B[0], Rd[0], B[1], Rd[1], B[2], Rd[2]].filter(Boolean).map(s => s.key);   // empty seats (bots off) just drop out
  const picks = [B[0], Rd[0], Rd[1], B[1], B[2], Rd[2]].filter(Boolean).map(s => s.key);
  const now = Date.now();
  await fb.f.set(R('draft'), { slots: slots.map(s => seatOut(s, '')), order: [...bans, ...picks], kinds: [...bans.map(() => 'ban'), ...picks.map(() => 'pick')],
    turn: 0, until: now + DRAFT_BAN_S * 1000, turnAt: now });
  await fb.f.update(R('meta'), { state: 'draft' });
}
export const draftKind = D => D?.kinds?.[D.turn] || 'pick';
const used = D => [...Object.values(D?.picks || {}), ...Object.values(D?.bans || {})];
export const draftFree = D => HEROES.filter(h => !used(D).includes(h.id));
// a guest banning or picking on their turn
export function draftPick(heroId) {
  const D = room?.draft;
  if (!D || D.order[D.turn] !== fb.uid || !draftFree(D).some(h => h.id === heroId)) return false;
  fb.f.set(R(`draft/${draftKind(D) === 'ban' ? 'bans' : 'picks'}/${fb.uid}`), heroId).catch(() => {});
  return true;
}
let draftBusy = false;
async function hostDraft() {
  if (!room || room.meta?.host !== fb.uid || room.meta?.state !== 'draft' || !room.draft || draftBusy) return;
  const D = room.draft, picks = D.picks || {}, bans = D.bans || {};
  if (D.turn >= D.order.length) return;
  const kind = draftKind(D), field = kind === 'ban' ? 'bans' : 'picks', mine = kind === 'ban' ? bans : picks;
  const key = D.order[D.turn], slot = D.slots.find(s => s.key === key);
  let choice = mine[key];
  // already taken or banned by someone else: choose again
  const others = [...Object.entries(picks).filter(([k]) => !(kind === 'pick' && k === key)), ...Object.entries(bans).filter(([k]) => !(kind === 'ban' && k === key))].map(([, h]) => h);
  if (choice && (others.includes(choice) || !HEROES.some(h => h.id === choice))) {
    draftBusy = true; await fb.f.remove(R(`draft/${field}/${key}`)).catch(() => {}); draftBusy = false;
    return;
  }
  const now = Date.now(), human = slot?.uid && room.players[slot.uid];
  if (!choice && (human ? now > D.until + GRACE_MS : now - (D.turnAt || 0) > BOT_PICK_MS)) {
    const free = draftFree(D);
    choice = free[Math.floor(Math.random() * free.length)].id;
  }
  if (!choice) return;
  draftBusy = true;
  const next = D.turn + 1, nextBan = D.kinds?.[next] === 'ban';
  try { await fb.f.update(R('draft'), { [`${field}/${key}`]: choice, turn: next, until: now + (nextBan ? DRAFT_BAN_S : DRAFT_PICK_S) * 1000, turnAt: now }); } catch {}
  draftBusy = false;
  if (next >= D.order.length && room) {
    const all = { ...picks, ...(kind === 'pick' ? { [key]: choice } : {}) };
    // a player who drafted the hero they have a skin on keeps it
    const roster = D.slots.map(s => seatOut(s, all[s.key], s.uid && room.players[s.uid]?.hero === all[s.key] ? room.players[s.uid].skin || '' : ''));
    await fb.f.remove(R('draft')).catch(() => {});
    await launch(roster);
  }
}

// ---------- in-match session ----------
const r2 = x => Math.round(x * 100) / 100;
const vec = v => [r2(v.x), r2(v.y), r2(v.z)];
const v3 = a => new THREE.Vector3(...(a || [0, 0, 0]));

function snap(h) {
  const st = (h.stunT > 0 ? 1 : 0) | (h.rootT > 0 ? 2 : 0) | (h.slowT > 0 || h.zoneSlow < 1 ? 4 : 0) | (h.hasteT > 0 ? 8 : 0)
    | (h.markT > 0 ? 16 : 0) | (h.invisT > 0 ? 32 : 0) | (h.barrierT > 0 || h.zoneMult < 1 ? 64 : 0);
  return { p: vec(h.pos), v: vec(h.vel), y: r2(h.yaw), pt: r2(h.pitch), hp: Math.max(0, Math.round(h.hp)), a: h.alive ? 1 : 0,
    g: h.onGround ? 1 : 0, st, k: h.kills, d: h.deaths, dm: Math.round(h.dmgDealt) };
}
const hillSnap = H => ({ i: H.idx, b: r2(H.pts2.blue), r: r2(H.pts2.red), m: r2(H.moveT), cb: H.count.blue, cr: H.count.red, c: H.contested ? 1 : 0, o: H.owner || '' });
// Lane Breaker, host → guests: every structure's health in build order, and each lane minion as
// [id, team (0 blue, 1 red), lane, x, z, hp]. A minion missing from the list has been destroyed.
const laneSnap = G => ({
  s: G.structures.map(s => Math.max(0, Math.round(s.hp))),
  m: G.minions.filter(m => m.alive && !m.deploy && m.id).map(m => [m.id, m.team === 'blue' ? 0 : 1, m.lane, r2(m.pos.x), r2(m.pos.z), Math.max(0, Math.round(m.hp))]),
  w: r2(G.waveT),
});
function netLane(G, v) {
  (v.s || []).forEach((hp, i) => {
    const s = G.structures[i]; if (!s || !s.alive) return;
    if (hp <= 0) unitDown(G, s);
    else if (Math.abs(s.hp - hp) >= 1) { if (hp < s.hp) s.pulse = 1; s.hp = hp; setBar(s); }
  });
  const seen = new Set();
  for (const a of Object.values(v.m || {})) {
    const [id, tm, lane, x, z, hp] = a; seen.add(id);
    let m = G.minions.find(o => o.puppet && o.id === id);
    if (!m) { m = spawnMinion(G, tm ? 'red' : 'blue', lane, 0, id); m.puppet = true; m.pos.set(x, 0, z); }
    m.netPos = { x, z };
    if (m.hp !== hp) { m.hp = hp; setBar(m); }
  }
  for (const m of G.minions) if (m.puppet && m.alive && !seen.has(m.id)) unitDown(G, m);
  if (v.w != null && Math.abs(G.waveT - v.w) > 1) G.waveT = v.w;              // keep the "minions in" countdown honest
}

export function openSession(G, match) {
  const { f } = fb, base = `match/${match}`;
  const S = { host: room?.meta?.host === fb.uid, uid: fb.uid, events: [], hits: new Map(), t: 0, unsubs: [], closed: false };
  // heroes, plus (Lane Breaker) towers and cores 's0'… and minions 'm12'…
  const byKey = k => !k ? null : k[0] === 's' && /^s\d+$/.test(k) ? G.structures[+k.slice(1)] || null
    : k[0] === 'm' && /^m\d+$/.test(k) ? G.minions.find(m => m.key === k && !m.deploy) || null : G.heroes.find(h => h.key === k) || null;
  const owned = t => t.kind === 'hero' ? t.local : S.host;            // whose machine applies damage to it

  S.queue = ev => { if (!S.closed) S.events.push(ev); };
  // damage on remote heroes is summed per attacker and sent with the next snapshot
  S.hit = (target, amt, src, head) => {
    const k = target.key + '|' + src.key;
    const e = S.hits.get(k) || { k: 'h', t: target.key, s: src.key, a: 0, hd: 0 };
    e.a = r2(e.a + amt); if (head) e.hd = 1;
    S.hits.set(k, e);
  };
  S.kill = (t, src) => S.queue({ k: 'k', t: t.key, s: src?.key || '', hd: t.killedByHead ? 1 : 0 });
  S.fire = (h, dir, charge) => S.queue({ k: 'f', h: h.key, d: vec(dir), c: r2(charge) });
  S.spray = (h, id, p, n) => S.queue({ k: 'sp', h: h.key, id, p: vec(p), n: vec(n), y: r2(h.yaw) });
  S.emote = (h, id) => S.queue({ k: 'em', h: h.key, id });
  S.towerShot = (s, t) => { if (S.host && t.key) S.queue({ k: 'tw', s: s.key, t: t.key }); };
  S.cast = (h, slot, ctx) => S.queue({ k: 'c', h: h.key, s: slot, a: vec(ctx.aim || new THREE.Vector3(0, 0, -1)), w: vec(ctx.wish || new THREE.Vector3()), tg: ctx.target?.key || '' });

  S.tick = dt => {
    if (S.closed || !room) return;
    // players who left the room drop out of the match
    for (const h of G.heroes) if (h.uid && !h.gone && !room.players[h.uid]) {
      h.gone = true; h.alive = false; h.mesh.visible = false; G.ev.netLeft?.(h);
    }
    S.t -= dt; if (S.t > 0) return;
    S.t = 1 / 15;
    const up = {};
    for (const h of G.heroes) if (h.local) up[`${base}/heroes/${h.key}`] = snap(h);
    if (S.host && G.hill) up[`${base}/hill`] = hillSnap(G.hill);
    if (S.host && G.mode === 'lane' && (S.laneN = (S.laneN || 0) + 1) % 2) up[`${base}/lane`] = laneSnap(G);   // 7.5 Hz is plenty for minions
    const list = [...S.events, ...S.hits.values()];
    S.events = []; S.hits.clear();
    if (list.length) up[`${base}/ev/${f.push(R(base + '/ev')).key}`] = { f: fb.uid, l: list };
    f.update(R(''), up).catch(() => {});
  };

  const onSnap = s => { const h = byKey(s.key); if (!h || h.local) return; h.net = s.val(); h.netT = G.time; };
  S.unsubs.push(f.onChildAdded(R(base + '/heroes'), onSnap), f.onChildChanged(R(base + '/heroes'), onSnap));
  S.unsubs.push(f.onChildAdded(R(base + '/ev'), s => {
    const b = s.val();
    if (!b || b.f === fb.uid || S.closed) return;
    for (const e of Object.values(b.l || {})) handle(e);
  }));
  S.unsubs.push(f.onValue(R(base + '/hill'), s => { if (!S.host && s.exists()) netHill(G, s.val()); }));
  S.unsubs.push(f.onValue(R(base + '/lane'), s => { if (!S.host && s.exists() && !S.closed) netLane(G, s.val()); }));

  function handle(e) {
    const h = byKey(e.h);
    if (e.k === 'f') { if (h && !h.local && h.alive) netShoot(G, h, v3(e.d), e.c ?? 1); }
    else if (e.k === 'c') { if (h && !h.local && h.alive) replayCast(G, h, e.s, { aim: v3(e.a), wish: v3(e.w), target: byKey(e.tg) }); }
    else if (e.k === 'h') { const t = byKey(e.t); if (t && owned(t) && t.alive) damage(G, t, e.a, byKey(e.s), !!e.hd, true); }
    else if (e.k === 'tw') { const s = byKey(e.s), t = byKey(e.t); if (s && t && !S.host) { s.pulse = 1; tracer(G, s.pos.clone().setY(4.8), chestOf(t), TEAM_COLOR[s.team], 0.25, 3); } }
    else if (e.k === 'k') { const t = byKey(e.t); if (t && !t.local) remoteKill(G, t, byKey(e.s), !!e.hd); }
    else if (e.k === 'sp') { if (h && !h.local) G.ev.netSpray?.(h, e.id, v3(e.p), v3(e.n), e.y || 0); }
    else if (e.k === 'em') { if (h && !h.local) G.ev.netEmote?.(h, e.id); }
    else if (e.k === 'gs') G.ev.netGuard?.(e.t, e.x, e.z);
    else if (e.k === 'end') G.ev.netEnd?.(e.w, e.y);
    else if (e.k === 'round' || e.k === 'rstart') G.ev.netRound?.(e);
  }

  S.flush = () => { if (S.closed) return; S.t = 0; S.tick(0); };         // send whatever is queued right now (the match is ending)
  S.close = () => { S.closed = true; S.unsubs.forEach(u => u()); };
  return S;
}

// Remote heroes are puppets: smoothed toward the owner's latest snapshot, then animated.
const tmp = new THREE.Vector3();
export function tickPuppet(G, h, dt, camera) {
  const s = h.net;
  if (h.gone) return;
  if (!h.alive) {
    tickCorpse(G, h, dt);
    if (s && s.a && G.time - (h.deadAt || 0) > 0.8) {             // owner respawned them
      spawnHero(G, h); h.pos.set(...s.p); h.hp = s.hp;
    }
    return;
  }
  if (!s) return;
  const lag = Math.min(0.15, G.time - (h.netT || G.time));
  tmp.set(...s.p).addScaledVector(v3(s.v), lag);
  if (tmp.distanceTo(h.pos) > 6) h.pos.copy(tmp); else h.pos.lerp(tmp, Math.min(1, dt * 14));
  let dy = s.y - h.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  h.yaw += dy * Math.min(1, dt * 16); h.pitch += (s.pt - h.pitch) * Math.min(1, dt * 16);
  h.vel.set(...s.v); h.onGround = !!s.g;
  if (h.hp !== s.hp) { h.hp = s.hp; setBar(h); }
  const st = s.st || 0, on = b => (st & b ? 0.12 : 0);
  h.stunT = on(1); h.rootT = on(2); h.slowT = on(4); h.hasteT = on(8); h.markT = on(16); h.invisT = on(32); h.barrierT = on(64);
  h.kills = s.k || 0; h.deaths = s.d || 0; h.dmgDealt = s.dm || 0;
  h.anim(dt, h.onGround ? Math.hypot(h.vel.x, h.vel.z) : 0, G.time);
  poseHero(G, h, dt, camera, G.playerTeam);
}
