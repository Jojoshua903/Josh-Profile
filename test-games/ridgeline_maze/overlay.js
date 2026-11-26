// Ridgeline HUD overlay: teammate markers, pings, one-time tips, zone cards and fading control hints.
// Everything here is plain DOM laid over each player's view, so it costs almost nothing to draw.
import { THREE } from './world.js';

const V = new THREE.Vector3();
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ================= per-view overlay ================= */
export function initOverlay(hudEl, ctrl) {
  const layer = document.createElement('div'); layer.className = 'marks'; hudEl.appendChild(layer);
  const tip = document.createElement('div'); tip.className = 'tipcard'; hudEl.appendChild(tip);
  const zone = document.createElement('div'); zone.className = 'zonecard'; hudEl.appendChild(zone);
  const keys = hudEl.querySelector('.keys');
  if (keys) keys.innerHTML = keyChips(ctrl);
  return { hud: hudEl, layer, tip, zone, keys, pool: new Map(), tipT: 0, zoneT: 0, keysT: 0 };
}

const CAP = (k) => `<kbd>${k}</kbd>`;
function keyChips(c) {
  const rows = c.id === 'mouse'
    ? [[['W', 'A', 'S', 'D'], 'move'], [['Shift'], 'sprint'], [['Space'], 'jump'], [['Click'], 'use'], [['1', '2', '3', '4'], 'tools · map'], [['E'], 'boost · crank'], [['G'], 'ping']]
    : c.id === 'p1'
      ? [[['W', 'A', 'S', 'D'], 'move'], [['L‑Shift'], 'sprint'], [['Space'], 'jump'], [['F'], 'use'], [['Q'], 'switch'], [['E'], 'boost · crank'], [['G'], 'ping']]
      : [[['Arrows'], 'move'], [['R‑Shift'], 'sprint'], [['Enter'], 'jump'], [['/'], 'use'], [['.'], 'switch'], [[','], 'boost · crank'], [["'"], 'ping']];
  return `<div class="kfull">${rows.map(([ks, l]) => `<span class="kc">${ks.map(CAP).join('')}<i>${l}</i></span>`).join('')}</div><div class="kmini">${CAP('H')}<i>controls</i></div>`;
}
/** Show the full controls for a while, then shrink to a small "H controls" chip. */
export function flashKeys(O, seconds = 18) { O.keysT = seconds; O.keys?.classList.add('open'); }
export function toggleKeys(O) { if (!O.keys) return; const open = !O.keys.classList.contains('open'); O.keys.classList.toggle('open', open); O.keysT = open ? 9999 : 0; }

/**
 * Draw markers for teammates and pings.
 * targets: [{ key, kind: 'mate'|'ping', name, color, x, y, z, tag }]
 */
export function updateMarkers(O, cam, w, h, targets, dt) {
  const seen = new Set(), M = 34;
  for (const t of targets) {
    seen.add(t.key);
    let el = O.pool.get(t.key);
    if (!el) {
      el = document.createElement('div'); el.className = 'mk ' + t.kind;
      el.innerHTML = '<span class="pin"><i class="arrow"></i></span><span class="tx"><b></b><small></small></span>';
      O.layer.appendChild(el); O.pool.set(t.key, el); el._b = el.querySelector('b'); el._s = el.querySelector('small');
    }
    const d = Math.hypot(t.x - cam.position.x, t.y - cam.position.y, t.z - cam.position.z);
    V.set(t.x, t.y, t.z).project(cam);
    const behind = V.z > 1;
    let sx = (V.x * .5 + .5) * w, sy = (-V.y * .5 + .5) * h;
    if (behind) { sx = w - sx; sy = h - sy; }
    const off = behind || sx < M || sx > w - M || sy < M || sy > h - M;
    if (off) {
      // pin to the screen edge, pointing towards the target
      const cx = w / 2, cy = h / 2; let dx = sx - cx, dy = sy - cy;
      if (behind && Math.abs(dy) < 1) dy = 1;
      const s = Math.min((cx - M) / Math.max(Math.abs(dx), 1e-3), (cy - M) / Math.max(Math.abs(dy), 1e-3));
      sx = cx + dx * s; sy = cy + dy * s;
      el.style.setProperty('--ang', Math.atan2(dy, dx) + 'rad');
    }
    el.classList.toggle('off', off);
    // teammates fade out when they are right next to you; pings stay
    el.classList.toggle('say', !!t.say);
    const near = t.kind === 'mate' && !t.say ? Math.min(1, Math.max(0, (d - 3) / 4)) : 1;
    el.style.opacity = near.toFixed(2);
    el.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)`;
    el.style.setProperty('--c', t.color);
    const name = t.name, sub = `${Math.round(d)} m${t.tag ? ' · ' + t.tag : ''}`;
    if (el._b.textContent !== name) el._b.textContent = name;
    if (el._s.textContent !== sub) el._s.textContent = sub;
    el.dataset.tag = t.tag || '';
  }
  for (const [k, el] of O.pool) if (!seen.has(k)) { el.remove(); O.pool.delete(k); }
  // timers for tips, zone cards and the controls panel
  if (O.tipT > 0) { O.tipT -= dt; if (O.tipT <= 0) O.tip.classList.remove('on'); }
  if (O.zoneT > 0) { O.zoneT -= dt; if (O.zoneT <= 0) O.zone.classList.remove('on'); }
  if (O.keysT > 0 && O.keysT < 9000) { O.keysT -= dt; if (O.keysT <= 0) O.keys?.classList.remove('open'); }
}
export function clearMarkers(O) { for (const el of O.pool.values()) el.remove(); O.pool.clear(); }

/* ================= one-time tips ================= */
let seenTips = new Set();
try { seenTips = new Set(JSON.parse(localStorage.getItem('ridgeline_tips') || '[]')); } catch {}
export const tipSeen = (id) => seenTips.has(id);
export function resetTips() { seenTips.clear(); try { localStorage.removeItem('ridgeline_tips'); } catch {} }
/** Shows a tip once per device. Returns true if it was shown. */
export function showTip(O, id, title, text, icon = 'info') {
  if (seenTips.has(id) || !O) return false;
  seenTips.add(id); try { localStorage.setItem('ridgeline_tips', JSON.stringify([...seenTips])); } catch {}
  O.tip.innerHTML = `<span class="ti ${icon}"></span><div><b>${esc(title)}</b><p>${esc(text)}</p></div>`;
  O.tip.classList.remove('on'); void O.tip.offsetWidth; O.tip.classList.add('on'); O.tipT = 7.5;
  return true;
}

/* ================= zone / objective title cards ================= */
export function zoneCard(O, title, sub, tone = '') {
  O.zone.className = 'zonecard ' + tone;
  O.zone.innerHTML = `<small>${esc(sub)}</small><b>${esc(title)}</b><i></i>`;
  void O.zone.offsetWidth; O.zone.classList.add('on'); O.zoneT = 3.2;
}
