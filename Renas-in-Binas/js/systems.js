import { THREE } from './core.js?v=20261114j';

// SOLAR SYSTEMS: the planets come in groups round their own sun, like the galaxies in Mario Galaxy.
// The groups follow the story route. The planet picker and the travel list show them, and every planet
// has its system's sun hanging in the sky.
export const SYSTEMS = [
  { icon: '🎵', nl: 'Het Basstelsel', en: 'The Bass System', sun: '#ff5ab4', planets: [0, 1, 3, 12, 16] },
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
// where planet number k of a system is on its orbit at time t (shared by the sky and the planet picker):
// inner planets are closer and go round faster, like a real solar system
export const orbitAngle = (k, t) => 0.7 + k * 2.1 + t * (0.11 / (1 + k * 0.7));

// the system's sun, far away in the sky of a planet (well inside the camera's reach of 1400),
// with the other planets of the system circling it on their orbits
export function addSystemSun(w, idx, cols = []) {
  const s = sysOf(idx), col = new THREE.Color(s.sun);
  const g = new THREE.Group();
  const toSun = new THREE.Vector3(0.55, 0.42, -0.72).normalize();
  g.position.copy(w.main.c).addScaledVector(toSun, 950);
  g.add(new THREE.Mesh(new THREE.SphereGeometry(42, 32, 20), new THREE.MeshBasicMaterial({ color: col.clone().lerp(new THREE.Color(0xffffff), 0.35), fog: false })));
  for (const [size, op] of [[260, 0.55], [520, 0.22]]) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(), color: col, transparent: true, opacity: op, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
    sp.scale.setScalar(size); g.add(sp);
  }
  // the orbit plane faces you, tipped over a bit, so the orbits look like a tilted solar-system map in the sky
  const plane = new THREE.Group(); g.add(plane);
  plane.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), toSun.clone().negate());
  plane.rotateX(-1.05);
  const others = [];
  s.planets.forEach((pi, k) => {
    const r = 95 + k * 60;   // at most 95 + 4 * 60 = 335 from the sun: still well inside the camera's reach
    const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 96 }, (_, i) => new THREE.Vector3(Math.cos(i / 96 * 6.2832) * r, Math.sin(i / 96 * 6.2832) * r, 0))),
      new THREE.LineBasicMaterial({ color: pi === idx ? col : 0xffffff, transparent: true, opacity: pi === idx ? 0.55 : 0.18, fog: false, depthWrite: false }));
    plane.add(ring);
    if (pi === idx) return;   // that's the planet you're standing on
    const pc = new THREE.Color(cols[pi] || '#ffffff'), body = new THREE.Group();
    body.add(new THREE.Mesh(new THREE.SphereGeometry(17 + (k % 3) * 4, 24, 16), new THREE.MeshToonMaterial({ color: pc, fog: false })));
    if (k % 2) { const rg = new THREE.Mesh(new THREE.TorusGeometry(30, 2.2, 6, 40), new THREE.MeshBasicMaterial({ color: pc.clone().lerp(new THREE.Color(0xffffff), 0.5), transparent: true, opacity: 0.7, fog: false })); rg.rotation.x = 1.2; body.add(rg); }
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(), color: pc, transparent: true, opacity: 0.45, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
    halo.scale.setScalar(90); body.add(halo);
    plane.add(body); others.push({ body, k, r });
  });
  w.updaters.push((dt, t) => { for (const o of others) { const a = orbitAngle(o.k, t); o.body.position.set(Math.cos(a) * o.r, Math.sin(a) * o.r, 0); o.body.rotation.z += dt * 0.3; } });
  w.group.add(g);
  return g;
}
