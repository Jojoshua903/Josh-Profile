import { THREE } from './core.js?v=20261111q';

// SOLAR SYSTEMS: the planets come in groups round their own sun, like the galaxies in Mario Galaxy.
// The groups follow the story route. The planet picker and the travel list show them, and every planet
// has its system's sun hanging in the sky.
export const SYSTEMS = [
  { icon: '🎵', nl: 'Het Basstelsel', en: 'The Bass System', sun: '#ff5ab4', planets: [0, 1, 3, 12] },
  { icon: '🌿', nl: 'Het Groene Stelsel', en: 'The Green System', sun: '#7dff6a', planets: [4, 5, 6, 13] },
  { icon: '🌅', nl: 'Het Schemerstelsel', en: 'The Twilight System', sun: '#ff9a3d', planets: [7, 9, 10, 14] },
  { icon: '🌙', nl: 'Het Thuisstelsel', en: 'The Home System', sun: '#fff2a0', planets: [8, 2] },
  { icon: '✨', nl: 'Het Gouden Stelsel', en: 'The Golden System', sun: '#ffd23a', planets: [11, 15] },
];
export const sysOf = (idx) => SYSTEMS.find((s) => s.planets.includes(idx)) || SYSTEMS[0];
export const sysName = (s, nl) => `${s.icon} ${nl ? s.nl : s.en}`;

// a soft round glow, drawn once and shared by every sun
let glowTex = null;
function glow() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return (glowTex = new THREE.CanvasTexture(c));
}
// the system's sun, far away in the sky of a planet (well inside the camera's reach of 1400)
export function addSystemSun(w, idx) {
  const s = sysOf(idx), col = new THREE.Color(s.sun);
  const g = new THREE.Group();
  g.position.copy(w.main.c).add(new THREE.Vector3(0.55, 0.42, -0.72).normalize().multiplyScalar(950));
  g.add(new THREE.Mesh(new THREE.SphereGeometry(42, 32, 20), new THREE.MeshBasicMaterial({ color: col.clone().lerp(new THREE.Color(0xffffff), 0.35), fog: false })));
  for (const [size, op] of [[260, 0.55], [520, 0.22]]) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(), color: col, transparent: true, opacity: op, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
    sp.scale.setScalar(size); g.add(sp);
  }
  w.group.add(g);
  return g;
}
