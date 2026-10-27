// Shows a small error box on screen, so a broken build can be reported instead of just looking frozen.
(function () {
  function show(msg) {
    let el = document.getElementById('errbox');
    if (!el) {
      el = document.createElement('div'); el.id = 'errbox';
      el.style.cssText = 'position:fixed;left:16px;right:16px;top:16px;z-index:99;background:#fff0ee;color:#7a1f14;border:3px solid #2b2440;border-radius:14px;padding:10px 14px;font:600 13px ui-monospace,Menlo,monospace;white-space:pre-wrap;box-shadow:4px 4px 0 #2b2440';
      document.body.appendChild(el);
    }
    el.textContent = 'Er ging iets mis — stuur deze tekst door:\n' + msg;
  }
  addEventListener('error', (e) => show((e.message || 'Fout') + (e.filename ? '\n' + e.filename.split('/').slice(-2).join('/') + ':' + e.lineno : '')));
  addEventListener('unhandledrejection', (e) => show(String(e.reason && (e.reason.stack || e.reason))));
})();
