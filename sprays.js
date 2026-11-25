import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { rayBox } from './world.js?v=20261126h';

// Sprays: sticker art you tag onto walls and floors with T during a match. Each player has one
// spray on the map at a time; a new one replaces the old. Won only at the slot machine.

const css = c => '#' + c.toString(16).padStart(6, '0');
export const SPRAY_RANGE = 8, SPRAY_CD = 4, SPRAY_SIZE = 1.7;

// The sticker: a chunky outlined badge in the spray's colours, a big glyph and a word across it.
function draw(c, S = 256) {
  const cv = document.createElement('canvas'); cv.width = cv.height = S;
  const g = cv.getContext('2d'), m = S / 2, r = S * 0.4;
  g.save(); g.translate(m, m); g.rotate(-0.08);
  const shape = () => {
    g.beginPath();
    if (c.shape === 'star') for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * 0.8 : r * 1.04; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    else if (c.shape === 'splat') for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2, rr = r * (0.86 + (i % 3 === 0 ? 0.16 : 0) + Math.sin(i * 2.7) * 0.05); g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    else g.arc(0, 0, r, 0, Math.PI * 2);
    g.closePath();
  };
  g.fillStyle = '#1d2340'; g.translate(7, 7); shape(); g.fill(); g.translate(-7, -7);    // drop shadow
  const gr = g.createLinearGradient(0, -r, 0, r); gr.addColorStop(0, css(c.a)); gr.addColorStop(1, css(c.b));
  g.fillStyle = gr; shape(); g.fill();
  g.lineWidth = S * 0.035; g.strokeStyle = '#1d2340'; g.stroke();
  g.lineWidth = S * 0.012; g.strokeStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(0, 0, r * 0.84, Math.PI * 1.1, Math.PI * 1.6); g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `${S * 0.36}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  g.fillText(c.glyph, 0, -S * 0.06);
  // the word: white with an ink outline, on a slanted ribbon
  g.rotate(-0.06);
  g.fillStyle = '#1d2340'; g.fillRect(-r * 0.92, S * 0.13, r * 1.84, S * 0.17);
  g.fillStyle = css(c.ribbon ?? 0xffc93c); g.fillRect(-r * 0.92 + 4, S * 0.13 + 4, r * 1.84 - 8, S * 0.17 - 8);
  g.font = `italic 900 ${S * 0.12}px Futura,"Avenir Next","Trebuchet MS",sans-serif`;
  g.lineWidth = S * 0.025; g.strokeStyle = '#1d2340'; g.strokeText(c.text, 0, S * 0.218);
  g.fillStyle = '#fff'; g.fillText(c.text, 0, S * 0.218);
  g.restore();
  return cv;
}
const urls = new Map(), texs = new Map();
export function sprayUrl(c) { if (!urls.has(c.id)) urls.set(c.id, draw(c, 160).toDataURL()); return urls.get(c.id); }
function sprayTex(c) {
  if (!texs.has(c.id)) { const t = new THREE.CanvasTexture(draw(c)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; texs.set(c.id, t); }
  return texs.get(c.id);
}

// Where a spray from `o` looking along `d` would land: the nearest wall, box top or floor in range.
export function aimSpray(G, o, d) {
  let best = SPRAY_RANGE, n = null;
  if (d.y < 0) { const t = -o.y / d.y; if (t < best) { best = t; n = new THREE.Vector3(0, 1, 0); } }
  for (const b of G.colliders) {
    if (!b.alive || b.unit) continue;
    const t = rayBox(o, d, b, best);
    if (!(t < best)) continue;
    best = t;
    const p = o.clone().addScaledVector(d, t);
    const faces = [[Math.abs(p.x - b.minX), -1, 0, 0], [Math.abs(p.x - b.maxX), 1, 0, 0], [Math.abs(p.z - b.minZ), 0, 0, -1],
      [Math.abs(p.z - b.maxZ), 0, 0, 1], [Math.abs(p.y - b.top), 0, 1, 0], [Math.abs(p.y - b.bottom), 0, -1, 0]];
    const f = faces.reduce((a, x) => x[0] < a[0] ? x : a);
    n = new THREE.Vector3(f[1], f[2], f[3]);
  }
  return n ? { p: o.clone().addScaledVector(d, best), n } : null;
}

// Put `c` down at point p with surface normal n. `who` is a key so each player keeps only one.
export function placeSpray(G, who, c, p, n, yaw = 0) {
  G.sprays ||= new Map();
  const old = G.sprays.get(who);
  if (old) { G.scene.remove(old); old.material.dispose(); }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(SPRAY_SIZE, SPRAY_SIZE), new THREE.MeshBasicMaterial({
    map: sprayTex(c), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
  m.position.copy(p).addScaledVector(n, 0.03);
  if (Math.abs(n.y) > 0.9) { m.rotation.set(-Math.PI / 2 * Math.sign(n.y), 0, 0); m.rotateZ(yaw); }   // floors: the top faces away from you
  else m.lookAt(m.position.clone().add(n));
  m.renderOrder = 2;
  G.scene.add(m); G.sprays.set(who, m);
  // a quick pop as it goes on
  m.scale.setScalar(0.4);
  const t0 = performance.now(), grow = () => { const k = Math.min(1, (performance.now() - t0) / 160); m.scale.setScalar(0.4 + 0.6 * (1 - (1 - k) ** 3) + Math.sin(k * Math.PI) * 0.12); if (k < 1) requestAnimationFrame(grow); };
  requestAnimationFrame(grow);
  return m;
}
