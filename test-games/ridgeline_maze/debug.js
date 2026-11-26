// Ridgeline debug screen (F3) and dev menu (` key). This file only draws UI; game.js supplies the data and the actions.
const esc = (s) => String(s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

/* ================= debug screen ================= */
// Modes: 0 off, 1 compact (fps + frame graph + render stats), 2 full (every section).
const N = 180, GW = 360, GH = 64;
export function makeDebug() {
  const el = document.createElement('div'); el.id = 'dbg';
  el.innerHTML = '<div class="dbg-top"><b>Debug</b><span class="dbg-fps"></span></div><canvas width="720" height="128"></canvas><div class="dbg-cols"></div><div class="dbg-foot">F3 · compact / full / off &nbsp;·&nbsp; ` · dev menu</div>';
  document.body.appendChild(el);
  const cv = el.querySelector('canvas'), g = cv.getContext('2d'); g.scale(2, 2);
  return { el, g, fps: el.querySelector('.dbg-fps'), cols: el.querySelector('.dbg-cols'), times: new Float32Array(N), head: 0, mode: 0, t: 0 };
}
export function setDebugMode(D, m) { D.mode = m; D.el.className = m === 0 ? '' : m === 1 ? 'on mini' : 'on'; D.t = 0; }
export function debugSample(D, ms) { D.times[D.head] = ms; D.head = (D.head + 1) % N; }
/** sections() → [[title, [[label, value, tone?], ...]], ...]. Only called ~4 times a second while the screen is up. */
export function debugDraw(D, dt, sections) {
  if (!D.mode) return;
  D.t -= dt; if (D.t > 0) return; D.t = .25;
  const list = []; for (const v of D.times) if (v > 0) list.push(v);
  const avg = list.length ? list.reduce((a, b) => a + b, 0) / list.length : 16.7;
  const sorted = list.slice().sort((a, b) => b - a), worst = sorted[0] || avg, low = sorted[Math.floor(sorted.length * .01)] || avg;
  const tone = avg > 20 ? 'bad' : avg > 17.5 ? 'warn' : 'good';
  D.fps.innerHTML = `<b class="${tone}">${Math.round(1000 / avg)}</b> fps · ${avg.toFixed(1)} ms · worst ${worst.toFixed(1)} · 1% low ${Math.round(1000 / low)}`;
  // frame-time graph: one bar per frame, guide lines at 60 fps and 30 fps
  const g = D.g; g.clearRect(0, 0, GW, GH);
  g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(0, 0, GW, GH);
  const y = (ms) => GH - Math.min(ms, 50) / 50 * GH, bw = GW / N;
  for (let k = 0; k < N; k++) {
    const v = D.times[(D.head + k) % N]; if (!v) continue;
    g.fillStyle = v > 33.4 ? '#ff6f59' : v > 17.5 ? '#ffd23f' : '#8ee34d';
    g.fillRect(k * bw, y(v), Math.max(1, bw - .4), GH - y(v));
  }
  g.font = '600 9px ui-monospace,Menlo,monospace'; g.textBaseline = 'bottom';
  for (const [ms, lbl] of [[16.7, '60'], [33.3, '30']]) { g.fillStyle = 'rgba(207,233,255,.45)'; g.fillRect(0, y(ms), GW, 1); g.fillText(lbl, 3, y(ms) - 1); }
  const secs = sections(), show = D.mode === 1 ? secs.slice(0, 1) : secs;
  D.cols.innerHTML = show.map(([title, rows]) => `<div class="dbg-s"><h6>${esc(title)}</h6>${rows.map(([k, v, t]) => `<div class="dbg-r"><span>${esc(k)}</span><b${t ? ` class="${t}"` : ''}>${esc(v)}</b></div>`).join('')}</div>`).join('');
}

/* ================= dev menu ================= */
// groups: [{ title, items: [...] }]. Item kinds:
//   { kind: 'toggle', label, hint, get(), set(v), cheat, when() }
//   { kind: 'button', label, hint, run(), cheat, when(), tone }
//   { kind: 'choice', label, options: [[value, text], ...], get(), set(v), cheat, when() }
//   { kind: 'seed',   label, run(seedNumber), cheat, when() }
// cheat: true means locked when allowCheats() is false (online rooms). when(): false greys the item out with its hint.
export function makeDevMenu(host, { groups, allowCheats, onAction, note }) {
  const el = document.createElement('div'); el.id = 'devmenu';
  el.innerHTML = `<div class="dv-head"><div><b>Dev menu</b><small>\` or Esc to close</small></div><button class="dv-x" title="Close">×</button></div><p class="dv-note"></p><div class="dv-body"></div>`;
  host.appendChild(el);
  const body = el.querySelector('.dv-body'), noteEl = el.querySelector('.dv-note'), all = [];
  groups.forEach((grp) => {
    const sec = document.createElement('section'); sec.innerHTML = `<h5>${esc(grp.title)}</h5>`; body.appendChild(sec);
    grp.items.forEach((it) => {
      const row = document.createElement('div'); row.className = 'dv-row dv-' + it.kind; it.row = row;
      if (it.kind === 'toggle') {
        row.innerHTML = `<label><span><b>${esc(it.label)}</b>${it.hint ? `<small>${esc(it.hint)}</small>` : ''}</span><button class="dv-sw" role="switch"><i></i></button></label>`;
        it.ctl = row.querySelector('.dv-sw'); it.ctl.onclick = () => { it.set(!it.get()); onAction?.(it); refresh(); };
      } else if (it.kind === 'button') {
        row.innerHTML = `<button class="dv-btn${it.tone ? ' ' + it.tone : ''}"><b>${esc(it.label)}</b>${it.hint ? `<small>${esc(it.hint)}</small>` : ''}</button>`;
        it.ctl = row.querySelector('button'); it.ctl.onclick = () => { it.run(); onAction?.(it); refresh(); };
      } else if (it.kind === 'choice') {
        row.innerHTML = `<span class="dv-lbl"><b>${esc(it.label)}</b></span><div class="dv-seg">${it.options.map(([v, t]) => `<button data-v="${esc(v)}">${esc(t)}</button>`).join('')}</div>`;
        it.ctl = row.querySelector('.dv-seg');
        row.querySelectorAll('.dv-seg button').forEach((b, k) => b.onclick = () => { it.set(it.options[k][0]); onAction?.(it); refresh(); });
      } else if (it.kind === 'seed') {
        row.innerHTML = `<span class="dv-lbl"><b>${esc(it.label)}</b></span><div class="dv-seedbox"><input type="number" min="0" step="1" placeholder="seed"><button class="dv-btn sm"><b>Go</b></button></div>`;
        const inp = row.querySelector('input'); it.ctl = row.querySelector('button'); it.inp = inp;
        const go = () => { const v = Math.floor(Math.abs(+inp.value)); if (inp.value === '' || !isFinite(v)) { inp.focus(); return; } it.run(v % 2147483647); onAction?.(it); refresh(); };
        it.ctl.onclick = go; inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); e.stopPropagation(); });
      }
      sec.appendChild(row); all.push(it);
    });
  });
  function refresh() {
    const ok = allowCheats();
    noteEl.textContent = note(); noteEl.style.display = noteEl.textContent ? '' : 'none';
    for (const it of all) {
      const locked = it.cheat && !ok, off = locked || (it.when && !it.when());
      it.row.classList.toggle('off', off); it.row.title = locked ? 'Cheats are off in online rooms' : '';
      if (it.kind === 'toggle') it.ctl.classList.toggle('on', !!it.get());
      if (it.kind === 'choice') { const v = it.get(); it.ctl.querySelectorAll('button').forEach((b, k) => b.classList.toggle('on', it.options[k][0] === v)); }
      it.row.querySelectorAll('button,input').forEach((b) => b.disabled = off);
    }
  }
  el.querySelector('.dv-x').onclick = () => onAction?.({ close: true });
  return { el, refresh, open(v) { el.classList.toggle('on', v); if (v) refresh(); }, get isOpen() { return el.classList.contains('on'); } };
}

/* a small chip that lists active cheats, so a screenshot or stream never hides that dev tools were on */
export function makeDevChip() { const el = document.createElement('div'); el.id = 'devchip'; document.body.appendChild(el); return el; }
export function setDevChip(el, list) { const t = list.length ? 'DEV · ' + list.join(' · ') : ''; if (el.textContent !== t) el.textContent = t; el.style.display = t ? 'block' : 'none'; }
