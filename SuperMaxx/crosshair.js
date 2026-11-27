import { cfg } from './settings.js?v=20261128w';

// Crosshair options (Settings → Crosshair). The crosshair is drawn as an SVG from these settings:
//   xhStyle    cross, gap (lines with a gap), dot, circle (ring and dot), chevron, tee (no top line)
//   xhColor    one of COLORS
//   xhSize     overall size, xhThick line thickness, xhGap the space in the middle
//   xhDot      a dot in the middle, xhOutline a dark edge, xhAlpha how see-through it is

export const XH_STYLES = [['cross', 'Cross'], ['gap', 'Gap'], ['dot', 'Dot'], ['circle', 'Circle'], ['chevron', 'Chevron'], ['tee', 'T']];
export const COLORS = { white: '#ffffff', green: '#5fff8a', yellow: '#ffe14a', cyan: '#5ff0ff', pink: '#ff5fc8', red: '#ff4d4d' };
export const XH_COLORS = Object.keys(COLORS).map(k => [k, k[0].toUpperCase() + k.slice(1)]);

export function crosshairSVG(o = cfg) {
  const c = COLORS[o.xhColor] || COLORS.white, s = +o.xhSize || 1, t = +o.xhThick || 2, gap = +o.xhGap || 0;
  const L = 9 * s, g = (o.xhStyle === 'gap' ? 3 : 0) + gap, R = 50;   // half-length, gap from centre, viewbox half-size
  const lines = [];
  const line = (x1, y1, x2, y2) => lines.push(`M${x1} ${y1}L${x2} ${y2}`);
  const st = o.xhStyle || 'cross';
  if (st === 'cross' || st === 'gap' || st === 'tee') {
    const a = g, b = g + L;
    if (st !== 'tee') line(0, -a, 0, -b);
    line(0, a, 0, b); line(-a, 0, -b, 0); line(a, 0, b, 0);
  }
  if (st === 'chevron') { const w = 7 * s; line(-w, w * 0.8 + gap, 0, gap); line(0, gap, w, w * 0.8 + gap); }
  const ring = st === 'circle' ? `<circle r="${(7 * s + gap).toFixed(1)}" fill="none"/>` : '';
  const dot = o.xhDot || st === 'dot' || st === 'circle' ? `<circle r="${(st === 'dot' ? 1.6 + t * 0.6 : 0.9 + t * 0.4) * Math.max(0.8, s)}" class="d"/>` : '';
  const path = lines.length ? `<path d="${lines.join('')}" fill="none"/>` : '';
  const body = `${path}${ring}`;
  const edge = o.xhOutline !== false ? `<g stroke="#1d2340" stroke-width="${t + 2.4}" stroke-linecap="square" opacity=".9">${body}${dot.replace('class="d"', 'fill="#1d2340" stroke="#1d2340" stroke-width="2.4"')}</g>` : '';
  return `<svg viewBox="${-R} ${-R} ${R * 2} ${R * 2}" style="opacity:${+o.xhAlpha || 1}">${edge}<g stroke="${c}" stroke-width="${t}" stroke-linecap="square">${body}${dot.replace('class="d"', `fill="${c}" stroke="none"`)}</g></svg>`;
}

// Put the crosshair in an element (the in-match one, or the settings preview).
export function applyCrosshair(el) {
  if (!el) return;
  el.classList.add('xh');
  el.innerHTML = crosshairSVG();
}
