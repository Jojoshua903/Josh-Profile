import { THREE, scene, toon, addOutline } from './core.js?v=muis1';

// Gewone koekjes = munten. Kosmische koekjes = de "moons": één ontwerp, elk een eigen naam.
export const cookies = [];

const coinMat = toon(0xffc23d);
coinMat.emissive.set(0x6a4200);
const cosmicMat = toon(0x8b5cff);
cosmicMat.emissive.set(0x3a1a80);
const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffe27a });
const haloMat = new THREE.MeshBasicMaterial({ color: 0xb79cff, transparent: true, opacity: 0.25, depthWrite: false });

const barGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.46, 10);
const knobGeo = new THREE.SphereGeometry(0.105, 10, 8);
function bone(mat, s, parent) {
  const g = new THREE.Group();
  const bar = new THREE.Mesh(barGeo, mat);
  bar.rotation.z = Math.PI / 2; addOutline(bar, 1.15); g.add(bar);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    const k = new THREE.Mesh(knobGeo, mat);
    k.position.set(0.25 * sx, 0.075 * sy, 0); addOutline(k, 1.12); g.add(k);
  }
  g.scale.setScalar(s); parent.add(g);
  return g;
}

function cosmic(g) {
  bone(cosmicMat, 1.7, g);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.8, 20, 14), haloMat);
  g.add(halo);
  const light = new THREE.PointLight(0xb79cff, 6, 7, 2);
  g.add(light);
  const sparks = [0, 1, 2].map(() => {
    const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.08), sparkMat);
    g.add(s);
    return s;
  });
  return (t) => {
    halo.scale.setScalar(1 + Math.sin(t * 4) * 0.08);
    sparks.forEach((s, i) => {
      const a = t * 2.4 + (i / 3) * Math.PI * 2;
      s.position.set(Math.cos(a) * 0.62, Math.sin(a * 2) * 0.15, Math.sin(a) * 0.62);
      s.rotation.y = t * 6;
    });
  };
}

export function addCookie(x, y, z, name = '', id = null) {
  const g = new THREE.Group();
  const rare = !!name;
  const anim = rare ? cosmic(g) : (bone(coinMat, 1.05, g), null);
  g.position.set(x, y, z);
  if (rare) g.traverse((o) => { if (o.isMesh && o.material !== haloMat) o.castShadow = true; });
  scene.add(g);
  // stable id so saved progress can find this cookie again
  const c = { g, base: y, got: false, name, anim, rare, id: id ?? (name || 'c' + cookies.length) };
  cookies.push(c);
  return c;
}
export function line(a, b, n, yFn) {
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    const x = a[0] + (b[0] - a[0]) * t, z = a[2] + (b[2] - a[2]) * t;
    addCookie(x, yFn ? yFn(x, z) : a[1] + (b[1] - a[1]) * t, z);
  }
}
export function circle(c, r, n, yFn) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, x = c[0] + Math.cos(a) * r, z = c[2] + Math.sin(a) * r;
    addCookie(x, yFn ? yFn(x, z) : c[1], z);
  }
}
