// Ridgeline online sync through Firebase Realtime Database
// Layout under ridgeline/{room}:
//   meta                 { seed, round, startAt, outcome? }
//   players/{id}         { id, name, color, x, y, z, yaw, st (0 climbing, 1 safe, 2 collapsed), crank, t }
//   marks/{round}/{key}  chalk mark
//   sticks/{round}/{key} glowstick { x,y,z,vx,vy,vz,c,t,rest }
//   doors/{round}/{id}   true once a door has been fully opened
//   events/{id}/{key}    boosts/shoves aimed at a player
//   rtc/{id}/{key}       WebRTC voice signalling (offer / answer / ice) for a player

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAjras7u8-rOwsAwTCNmwWs_vxDzwVfi1Q",
  authDomain: "widf-2b62d.firebaseapp.com",
  databaseURL: "https://widf-2b62d-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "widf-2b62d",
  storageBucket: "widf-2b62d.firebasestorage.app",
  messagingSenderId: "70385823661",
  appId: "1:70385823661:web:0df76dafeb7c06765afb24",
  measurementId: "G-ZDTP87TSLF"
};
const VER = '10.12.2';
export const COLORS = ['#ffd23f', '#ff6f59', '#2ec4f1', '#8ee34d', '#ff5fa2', '#a37bff', '#ff9f1c', '#3ddc97'];
const STALE_MS = 30000;
const newSeed = () => Math.floor(Math.random() * 2 ** 31);
const sleepMs = (ms) => new Promise((r) => setTimeout(r, ms));

let sdk = null;
export async function loadSdk() {
  if (sdk) return sdk;
  const base = `https://www.gstatic.com/firebasejs/${VER}/`;
  const [app, db] = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-database.js')]);
  return sdk = { app, db };
}

export const myId = (() => {
  const mk = () => Math.random().toString(36).slice(2, 12);
  try { let id = sessionStorage.getItem('ridgeline_id'); if (!id) { id = mk(); sessionStorage.setItem('ridgeline_id', id); } return id; } catch { return mk(); }
})();

/**
 * Join a room. handlers: onMeta(meta), onPlayers(map), onMark(data,key), onStick(data,key),
 * onStickRest(data,key), onEvent(ev)
 */
export async function joinRoom(roomName, name, handlers, look = {}) {
  const { initializeApp, getApps } = sdk.app, D = sdk.db;
  const app = getApps()[0] || initializeApp(FIREBASE_CONFIG);
  const db = D.getDatabase(app);
  const room = (roomName || 'lobby').replace(/[\/.#$\[\]]/g, '-').slice(0, 24) || 'lobby';
  const base = `ridgeline/${room}`;
  const r = (p) => D.ref(db, `${base}/${p}`);
  const metaRef = r('meta');

  // shared clock so everyone sees the fog in the same place
  let offset = 0;
  try {
    offset = await Promise.race([
      new Promise((res) => D.onValue(D.ref(db, '.info/serverTimeOffset'), (s) => res(s.val() || 0), { onlyOnce: true })),
      sleepMs(1500).then(() => 0),
    ]);
  } catch {}
  const now = () => Date.now() + offset;
  // new rooms start in the lobby; a maze round whose fog has long since finished falls back to the lobby
  const tx = await D.runTransaction(metaRef, (m) => {
    if (!m) return { seed: newSeed(), round: 0, phase: 'lobby', pace: 1, daily: false };
    if (m.phase !== 'lobby' && (!m.startAt || now() - m.startAt > 1100000)) return { ...m, phase: 'lobby', outcome: null };
    return m;
  });
  const meta = tx.snapshot.val();
  if (!meta.startAt) meta.startAt = now();

  const t0 = Date.now(), used = new Set();
  const ps = (await D.get(r('players'))).val() || {};
  for (const p of Object.values(ps)) if (p.id !== myId && t0 - p.t < STALE_MS) used.add(p.color);
  const color = look.jacket || COLORS.find((c) => !used.has(c)) || COLORS[Math.floor(Math.random() * COLORS.length)];

  const meRef = r(`players/${myId}`), evRef = r(`events/${myId}`), rtcRef = r(`rtc/${myId}`);
  await D.onDisconnect(meRef).remove();
  await D.onDisconnect(evRef).remove();
  await D.onDisconnect(rtcRef).remove();
  await D.set(meRef, { id: myId, name, color, look: JSON.stringify(look), x: 0, y: 0, z: 0, yaw: 0, st: 0, crank: -1, t: Date.now() });
  await D.remove(evRef); await D.remove(rtcRef);

  const net = { room, name, color, meta, round: meta.round, unsubs: [], roundUnsubs: [], now, lookStr: JSON.stringify(look), last: { x: 0, y: 0, z: 0, yaw: 0, st: 0, crank: -1 } };

  net.subscribeRound = (round) => {
    net.roundUnsubs.forEach((u) => u()); net.roundUnsubs = [];
    net.round = round;
    const mRef = r(`marks/${round}`), sRef = r(`sticks/${round}`), dRef = r(`doors/${round}`);
    net.roundUnsubs.push(D.onChildAdded(mRef, (s) => handlers.onMark(s.val(), s.key)));
    net.roundUnsubs.push(D.onChildAdded(sRef, (s) => handlers.onStick(s.val(), s.key)));
    net.roundUnsubs.push(D.onChildChanged(sRef, (s) => { const v = s.val(); if (v.rest) handlers.onStickRest(v, s.key); }));
    net.roundUnsubs.push(D.onChildAdded(dRef, (s) => handlers.onDoor(+s.key)));
  };
  net.start = () => {
    net.subscribeRound(net.round);
    net.unsubs.push(D.onValue(metaRef, (s) => { const m = s.val(); if (m) handlers.onMeta(m); }));
    net.unsubs.push(D.onValue(r('players'), (s) => {
      const all = s.val() || {}, t = Date.now(), live = {};
      for (const [id, p] of Object.entries(all)) if (id === myId || t - p.t < STALE_MS) live[id] = p;
      handlers.onPlayers(live);
    }));
    net.unsubs.push(D.onChildAdded(evRef, (s) => { handlers.onEvent(s.val()); D.remove(s.ref); }));
    net.unsubs.push(D.onChildAdded(rtcRef, (s) => { const v = s.val(); D.remove(s.ref); if (v && v.from) handlers.onSignal(v.from, v); }));
    // connection watch: Firebase deletes our player record when the socket drops (onDisconnect), so on reconnect
    // we re-arm the cleanup and write the full record back, otherwise everyone else would see a nameless ghost
    let first = true, wasDown = false;
    net.unsubs.push(D.onValue(D.ref(db, '.info/connected'), async (s) => {
      if (!s.val()) { if (!first && !wasDown) { wasDown = true; handlers.onConnection?.(false); } return; }
      first = false; if (!wasDown) return; wasDown = false;
      try {
        await D.onDisconnect(meRef).remove(); await D.onDisconnect(evRef).remove(); await D.onDisconnect(rtcRef).remove();
        await D.set(meRef, { id: myId, name, color: net.color, look: net.lookStr, ...net.last, t: Date.now() });
      } catch {}
      handlers.onConnection?.(true);
    }));
  };

  net.sendState = (p) => {
    net.last = { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), yaw: +p.yaw.toFixed(3), st: p.st || 0, crank: p.crank ?? -1 };
    return D.update(meRef, { ...net.last, t: Date.now() }).catch(() => {});
  };
  net.signal = (to, msg) => D.push(r(`rtc/${to}`), { ...msg, from: myId }).catch(() => {});
  net.latchDoor = (id) => D.set(r(`doors/${net.round}/${id}`), true).catch(() => {});
  net.newMarkKey = () => D.push(r(`marks/${net.round}`)).key;
  net.putMark = (key, d) => D.set(r(`marks/${net.round}/${key}`), d).catch(() => {});
  net.newStickKey = () => D.push(r(`sticks/${net.round}`)).key;
  net.putStick = (key, d) => D.set(r(`sticks/${net.round}/${key}`), d).catch(() => {});
  net.restStick = (key, s) => D.update(r(`sticks/${net.round}/${key}`), { rest: true, x: +s.x.toFixed(3), y: +s.y.toFixed(3), z: +s.z.toFixed(3) }).catch(() => {});
  net.sendEvent = (targetId, ev) => D.push(r(`events/${targetId}`), ev).catch(() => {});

  net.setLook = (color, lk) => { net.color = color; net.lookStr = JSON.stringify(lk); return D.update(meRef, { color, look: net.lookStr }).catch(() => {}); };
  net.setSettings = (s) => D.runTransaction(metaRef, (m) => { if (!m || m.phase === 'maze') return; return { ...m, ...s }; }).catch(() => {});
  // everyone is aboard: start the next maze a few seconds from now (first client to ask wins)
  net.depart = () => D.runTransaction(metaRef, (m) => {
    if (!m || m.phase === 'maze') return;
    const daily = !!m.daily, d = new Date(), dseed = (d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate()) * 2654435761 % 2147483647;
    return { ...m, seed: daily ? dseed : newSeed(), round: (m.round || 0) + 1, startAt: now() + 6500, phase: 'maze', outcome: null };
  }).catch(() => {});
  // outcome: { win: bool, time, escaped: [names], lost: [names] }. First client to call it decides.
  net.endRound = (outcome) => D.runTransaction(metaRef, (m) => {
    if (!m || m.round !== net.round || m.outcome) return;
    m.outcome = outcome; return m;
  }).catch(() => {});
  net.backToLobby = (round) => D.runTransaction(metaRef, (m) => {
    if (!m || m.round !== round || m.phase !== 'maze') return;
    return { ...m, phase: 'lobby', outcome: null };
  }).then((res) => { if (res && res.committed) { ['marks', 'sticks', 'doors'].forEach((k) => D.remove(r(`${k}/${round}`))); } }).catch(() => {});

  net.leave = () => {
    net.roundUnsubs.forEach((u) => u()); net.unsubs.forEach((u) => u());
    D.remove(meRef).catch(() => {}); D.remove(evRef).catch(() => {}); D.remove(rtcRef).catch(() => {});
  };
  return net;
}
