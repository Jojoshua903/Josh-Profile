import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { FIREBASE_CONFIG, FIREBASE_VERSION } from './firebase-config.js?v=20261126r';
import { HEROES } from './heroes.js?v=20261126r';
import { damage, remoteKill, netShoot, spawnHero, setBar, tickCorpse } from './units.js?v=20261126r';
import { replayCast } from './abilities.js?v=20261126r';
import { netHill } from './hill.js?v=20261126r';
import { poseHero } from './anim.js?v=20261126r';

// Online play over Firebase Realtime Database.
//
// Layout:  rooms/{CODE}/meta      host, state (lobby|playing), map, match number, roster
//          rooms/{CODE}/players   one entry per connected player (name, hero, skin, team)
//          rooms/{CODE}/match/{n}/heroes/{key}  15 Hz snapshot written by whoever owns that hero
//          rooms/{CODE}/match/{n}/ev/{push}     batched events: shots, casts, hits, kills
//          rooms/{CODE}/match/{n}/hill          hill state, written by the host
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
  const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/`;
  let appM, authM, dbM;
  try {
    [appM, authM, dbM] = await Promise.all(['firebase-app.js', 'firebase-auth.js', 'firebase-database.js'].map(f => import(base + f)));
  } catch {
    throw Object.assign(new Error('Could not load Firebase. This preview blocks outside connections, so open the hosted (GitHub Pages) version.'), { code: 'blocked' });
  }
  const app = appM.initializeApp(FIREBASE_CONFIG);
  let cred;
  try { cred = await authM.signInAnonymously(authM.getAuth(app)); }
  catch (e) { throw explain(e); }
  fb = { db: dbM.getDatabase(app), uid: cred.user.uid, f: dbM };
  return fb;
}

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
  return { code: room.code, meta: room.meta, players: room.players, me: fb.uid, host: room.meta?.host === fb.uid };
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
  await enter(code, true);
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
  if (!players[fb.uid] && v.meta.mode === 'duel' && Object.keys(players).length >= 2) throw new Error('That room is set to Duel and already has two players');
  if (v.meta.state === 'playing') throw new Error('A match is in progress there. Try again when it ends');
  const team = teamCount(players, 'blue') <= teamCount(players, 'red') ? 'blue' : 'red';
  await f.set(f.ref(fb.db, `rooms/${code}/players/${fb.uid}`), { ...profile, team, t: Date.now() });
  await enter(code, false);
  return code;
}

async function enter(code, isHost) {
  const { f } = fb;
  room = { code, meta: null, players: {}, unsubs: [], started: 0 };
  f.onDisconnect(R('players/' + fb.uid)).remove();
  if (isHost) f.onDisconnect(R('')).remove();                 // no host migration yet: host leaving closes the room
  room.unsubs.push(f.onValue(R('meta'), s => {
    if (!room) return;
    if (!s.exists()) { closeLocal('The host closed the room'); return; }
    room.meta = s.val();
    if (room.meta.state === 'playing' && room.meta.match !== room.started) {
      room.started = room.meta.match;
      startCbs.forEach(cb => cb({ roster: Object.values(room.meta.roster || {}), map: room.meta.map, match: room.meta.match, mode: room.meta.mode || 'hill' }));
    }
    emit();
  }));
  room.unsubs.push(f.onValue(R('players'), s => { if (!room) return; room.players = s.val() || {}; emit(); }));
}

function closeLocal(reason) {
  if (!room) return;
  room.unsubs.forEach(u => u());
  room = null;
  emit({ closed: reason });
}

export async function leaveRoom() {
  if (!room) return;
  const { f } = fb, code = room.code, host = room.meta?.host === fb.uid;
  room.unsubs.forEach(u => u());
  room = null; emit();
  try {
    await f.remove(f.ref(fb.db, host ? `rooms/${code}` : `rooms/${code}/players/${fb.uid}`));
  } catch {}
}

export function setProfile(patch) { if (room) fb.f.update(R('players/' + fb.uid), patch).catch(() => {}); }
export function setMap(map) { if (room && lobbyState().host) fb.f.update(R('meta'), { map }).catch(() => {}); }
export function setMode(mode) { if (room && lobbyState().host) fb.f.update(R('meta'), { mode }).catch(() => {}); }
export function backToLobby() { if (room && lobbyState().host) fb.f.update(R('meta'), { state: 'lobby' }).catch(() => {}); }

// Host: lock in teams, fill empty slots with bots, and start everyone at once.
// Hill Rush is 3v3; a Duel is the first two players, one per side (a bot if you're alone).
export async function startMatch() {
  if (!room || !lobbyState().host) return;
  const duel = room.meta.mode === 'duel';
  const players = Object.entries(room.players).sort((a, b) => a[1].t - b[1].t);
  if (duel && players.length > 2) throw new Error('Duel is 1v1: only two players can be in the room');
  // bots take heroes nobody in the room picked, each one different
  const taken = new Set(players.map(([, p]) => p.hero));
  const pool = HEROES.filter(h => !taken.has(h.id)).sort(() => Math.random() - 0.5);
  const roster = [];
  const human = (uid, p, team) => ({ key: uid, uid, name: p.name || 'Player', hero: p.hero, skin: p.skin || '', team, cos: p.cos || {} });
  if (duel) {
    players.forEach(([uid, p], i) => roster.push(human(uid, p, i ? 'red' : 'blue')));
    if (roster.length < 2) roster.push({ key: 'bot-red-0', uid: '', name: '', hero: pool.pop().id, skin: '', team: 'red' });
  } else for (const team of ['blue', 'red']) {
    const humans = players.filter(([, p]) => p.team === team).slice(0, 3);
    for (const [uid, p] of humans) roster.push(human(uid, p, team));
    for (let i = humans.length; i < 3; i++) roster.push({ key: `bot-${team}-${i}`, uid: '', name: '', hero: pool.pop().id, skin: '', team });
  }
  const match = (room.meta.match || 0) + 1;
  await fb.f.remove(R('match'));
  await fb.f.update(R('meta'), { state: 'playing', match, roster });
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

export function openSession(G, match) {
  const { f } = fb, base = `match/${match}`;
  const S = { host: room?.meta?.host === fb.uid, uid: fb.uid, events: [], hits: new Map(), t: 0, unsubs: [], closed: false };
  const byKey = k => k ? G.heroes.find(h => h.key === k) : null;

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

  function handle(e) {
    const h = byKey(e.h);
    if (e.k === 'f') { if (h && !h.local && h.alive) netShoot(G, h, v3(e.d), e.c ?? 1); }
    else if (e.k === 'c') { if (h && !h.local && h.alive) replayCast(G, h, e.s, { aim: v3(e.a), wish: v3(e.w), target: byKey(e.tg) }); }
    else if (e.k === 'h') { const t = byKey(e.t); if (t && t.local && t.alive) damage(G, t, e.a, byKey(e.s), !!e.hd, true); }
    else if (e.k === 'k') { const t = byKey(e.t); if (t && !t.local) remoteKill(G, t, byKey(e.s), !!e.hd); }
    else if (e.k === 'sp') { if (h && !h.local) G.ev.netSpray?.(h, e.id, v3(e.p), v3(e.n), e.y || 0); }
    else if (e.k === 'end') G.ev.netEnd?.(e.w);
    else if (e.k === 'round' || e.k === 'rstart') G.ev.netRound?.(e);
  }

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
