// Tiny shared store. Online it mirrors /rooms/{room} of a Firebase Realtime Database over
// REST + server-sent events (no SDK). Offline it keeps the same tree in localStorage.
// Every write is applied locally straight away, then confirmed by the server echo.
const SV_NOW = {'.sv': 'timestamp'};

function makeStore(dbUrl, room){
  const st = {online: !!dbUrl, status: dbUrl ? 'connecting' : 'local', tree: {}, offset: 0};
  const join = (a, b) => [a, b].filter(Boolean).join('/');
  st.now = () => Date.now() + st.offset;
  const resolve = v => {
    if (v && typeof v === 'object'){
      if (v['.sv'] === 'timestamp') return Math.round(st.now());
      const o = Array.isArray(v) ? [] : {}; for (const k in v) o[k] = resolve(v[k]); return o;
    }
    return v;
  };
  function setPath(path, val){
    const parts = String(path).split('/').filter(Boolean);
    if (!parts.length){ st.tree = val && typeof val === 'object' ? val : {}; return; }
    let n = st.tree;
    for (let i = 0; i < parts.length - 1; i++){
      if (!n[parts[i]] || typeof n[parts[i]] !== 'object'){ if (val === null) return; n[parts[i]] = {}; }
      n = n[parts[i]];
    }
    const k = parts[parts.length - 1];
    if (val === null || val === undefined) delete n[k]; else n[k] = val;
  }
  let pushN = 0;
  const pushKey = () => Math.round(st.now()).toString(36).padStart(9, '0') + (pushN++ % 1296).toString(36).padStart(2, '0') + Math.random().toString(36).slice(2, 6);

  if (!dbUrl){
    const KEY = 'derij-local-' + room;
    try { st.tree = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
    let timer = 0;
    const persist = () => { if (!timer) timer = setTimeout(() => { timer = 0; try { localStorage.setItem(KEY, JSON.stringify(st.tree)); } catch (e) {} }, 300); };
    st.loaded = true;
    st.put = (p, v) => { setPath(p, resolve(v)); persist(); };
    st.patch = (p, o) => { for (const k in o) setPath(join(p, k), resolve(o[k])); persist(); };
    st.push = (p, v) => { const k = pushKey(); st.put(join(p, k), v); return k; };
    st.remove = p => st.put(p, null);
    st.goodbye = () => {};
    return st;
  }

  const root = dbUrl.replace(/\/+$/, '');
  const base = root + '/rooms/' + encodeURIComponent(room);
  const url = p => base + (p ? '/' + p : '') + '.json';
  const send = (method, p, body, keepalive) =>
    fetch(url(p), {method, body: body === undefined ? undefined : JSON.stringify(body), keepalive})
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .catch(e => { st.status = 'error'; st.lastError = String(e.message || e); });

  st.put = (p, v) => { setPath(p, resolve(v)); send('PUT', p, v); };
  st.patch = (p, o) => { for (const k in o) setPath(join(p, k), resolve(o[k])); send('PATCH', p, o); };
  st.push = (p, v) => { send('POST', p, v); };
  st.remove = p => { setPath(p, null); send('DELETE', p); };
  st.goodbye = paths => { for (const p of paths) fetch(url(p), {method: 'DELETE', keepalive: true}).catch(() => {}); };

  // Server clock: write a server timestamp and read it back.
  const clockId = Math.random().toString(36).slice(2, 10);
  (async () => {
    try {
      const t0 = Date.now();
      const ts = await fetch(root + '/clock/' + clockId + '.json', {method: 'PUT', body: JSON.stringify(SV_NOW)}).then(r => r.json());
      if (typeof ts === 'number') st.offset = ts - (t0 + Date.now()) / 2;
      fetch(root + '/clock/' + clockId + '.json', {method: 'DELETE'}).catch(() => {});
    } catch (e) {}
  })();

  const es = new EventSource(url(''));
  const apply = kind => e => {
    let msg; try { msg = JSON.parse(e.data); } catch (err) { return; }
    if (!msg) return;
    if (kind === 'put') setPath(msg.path, msg.data);
    else for (const k in msg.data) setPath(join(msg.path, k), msg.data[k]);
    st.status = 'live'; st.loaded = true;
  };
  es.addEventListener('put', apply('put'));
  es.addEventListener('patch', apply('patch'));
  es.addEventListener('cancel', () => { st.status = 'error'; st.lastError = 'database rules refused access'; });
  es.onopen = () => { st.status = 'live'; };
  es.onerror = () => { if (st.status !== 'error') st.status = 'connecting'; };
  return st;
}
