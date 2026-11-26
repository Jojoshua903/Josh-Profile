import { cfg, save } from './settings.js?v=20261127l';

// Optional performance overlay (Settings → Video, or F3): FPS, 1% low, frame time,
// draw calls, triangles, GPU memory and the render scale. Updates a few times a second.

let el = null, acc = 0, last = performance.now();
const frames = [];

export function perfFrame(renderer, extra = '') {
  const now = performance.now(), ms = Math.min(250, now - last); last = now;
  frames.push(ms); if (frames.length > 240) frames.shift();
  if (!cfg.perf) { if (el) el.style.display = 'none'; return; }
  if (!el) { el = document.createElement('div'); el.id = 'perf'; document.body.append(el); }
  el.style.display = '';
  if ((acc += ms) < 400) return;
  acc = 0;
  const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
  const worst = [...frames].sort((a, b) => b - a)[Math.floor(frames.length * 0.01)] || avg;
  const fps = Math.round(1000 / avg), i = renderer.info;
  el.className = fps >= 55 ? 'good' : fps >= 35 ? 'ok' : 'bad';
  el.innerHTML = `<b>${fps}</b> FPS<span>1% low ${Math.round(1000 / worst)} · ${avg.toFixed(1)} ms</span>`
    + `<span>${i.render.calls} draws · ${(i.render.triangles / 1000).toFixed(0)}k tris</span>`
    + `<span>${i.memory.geometries} geo · ${i.memory.textures} tex</span>`
    + `<span>${cfg.quality} · ${renderer.getPixelRatio().toFixed(2)}× scale</span>${extra ? `<span>${extra}</span>` : ''}`;
}

addEventListener('keydown', e => { if (e.code === 'F3') { e.preventDefault(); cfg.perf = !cfg.perf; save(); } });
