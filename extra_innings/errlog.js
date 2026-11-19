/* ============================================================
   ERROR LOG · loaded first on every page
   Every error goes to the console: uncaught throws, rejected promises,
   scripts/images that fail to load, and everything the game catches itself
   (via logErr). A repeat of the same error prints once per second with a
   count, so a per-frame bug can't freeze DevTools.
   In the console: EI_ERRORS lists everything, EI_ERRORS_DUMP() prints a table.
   ============================================================ */
const EI_ERRORS = [];
const EI_ERR_SEEN = new Map();
function logErr(where, e) {
  const msg = e && e.message ? e.message : String(e);
  const key = where + '|' + msg;
  const now = performance.now();
  let s = EI_ERR_SEEN.get(key);
  if (!s) {
    s = { n: 0, shown: 0, last: 0 };
    EI_ERR_SEEN.set(key, s);
    EI_ERRORS.push({ where, msg, error: e, at: new Date().toISOString(), seen: s });
  }
  s.n++;
  if (s.n === 1) console.error(`[Extra Innings] ${where}:`, e);
  else if (now - s.last > 1000) {
    console.error(`[Extra Innings] ${where}: (×${s.n - s.shown} again)`, msg);
    s.shown = s.n;
  } else return;
  s.last = now;
}
function EI_ERRORS_DUMP() {
  console.table(EI_ERRORS.map(r => ({ where: r.where, error: r.msg, count: r.seen.n, first: r.at })));
}
addEventListener('error', ev => {
  const t = ev.target;
  if (t && t !== window && (t.src || t.href)) logErr('failed to load ' + t.tagName.toLowerCase(), t.src || t.href);
  else logErr(`uncaught @ ${(ev.filename || '').split('/').pop()}:${ev.lineno}:${ev.colno}`, ev.error || ev.message);
}, true);
addEventListener('unhandledrejection', ev => logErr('unhandled promise', ev.reason));
