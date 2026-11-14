import { THREE, basic, V3, anyPerp, placeOn, surf, rOf } from './core.js?v=20261114b';

// A glowing wall that stands up out of a planet's surface. Used for shockwave rings and sweeping lasers.
export class SurfaceWall {
  constructor(parent, planet, color, height = 0.8, seg = 80, opacity = 0.8) {
    this.p = planet; this.h = height; this.seg = seg;
    const pos = new Float32Array((seg + 1) * 2 * 3);
    const idx = [];
    for (let i = 0; i < seg; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.geo.setIndex(idx);
    this.mat = basic(color, { transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    parent.add(this.mesh);
    // a darker core band so it reads on bright ground too
    this.mat2 = basic(color, { transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
    this.mesh2 = new THREE.Mesh(this.geo, this.mat2); this.mesh2.frustumCulled = false; this.mesh2.visible = false;
    parent.add(this.mesh2);
  }
  set visible(v) { this.mesh.visible = v; this.mesh2.visible = v; }
  get visible() { return this.mesh.visible; }
  _write(dirFn) {
    const a = this.geo.attributes.position.array, c = this.p.c;
    for (let i = 0; i <= this.seg; i++) {
      const d = dirFn(i / this.seg);
      const b = i * 6, R = rOf(this.p, d);   // follows the ground, also on shaped planets
      a[b] = c.x + d.x * (R + 0.03); a[b + 1] = c.y + d.y * (R + 0.03); a[b + 2] = c.z + d.z * (R + 0.03);
      a[b + 3] = c.x + d.x * (R + this.h); a[b + 4] = c.y + d.y * (R + this.h); a[b + 5] = c.z + d.z * (R + this.h);
    }
    this.geo.attributes.position.needsUpdate = true;
  }
  // a circle at angular radius th around the pole B
  ring(B, th) {
    const e1 = anyPerp(B), e2 = new THREE.Vector3().crossVectors(B, e1);
    const ct = Math.cos(th), st = Math.sin(th), d = V3();
    this._write((u) => { const ph = u * Math.PI * 2; return d.copy(B).multiplyScalar(ct).addScaledVector(e1, st * Math.cos(ph)).addScaledVector(e2, st * Math.sin(ph)); });
  }
  // a line from the pole B outward along longitude ph (in B's frame), from th0 to th1
  meridian(B, ph, th0, th1) {
    const e1 = anyPerp(B), e2 = new THREE.Vector3().crossVectors(B, e1), d = V3();
    const side = e1.clone().multiplyScalar(Math.cos(ph)).addScaledVector(e2, Math.sin(ph));
    this._write((u) => { const th = th0 + (th1 - th0) * u; return d.copy(B).multiplyScalar(Math.cos(th)).addScaledVector(side, Math.sin(th)); });
  }
}
// longitude of `dir` around pole B, in the same frame meridian() uses
export function lonAround(B, dir) {
  const e1 = anyPerp(B), e2 = new THREE.Vector3().crossVectors(B, e1);
  return Math.atan2(dir.dot(e2), dir.dot(e1));
}

// A warning circle on the ground (where something will land)
const ringGeo = (r) => { const g = new THREE.RingGeometry(r * 0.78, r, 36); g.rotateX(-Math.PI / 2); return g; };
const discGeo = (r) => { const g = new THREE.CircleGeometry(r, 36); g.rotateX(-Math.PI / 2); return g; };
export function makeMarker(parent, r, color = 0xff3a5a) {
  const g = new THREE.Group();
  const rim = new THREE.Mesh(ringGeo(r), basic(color, { transparent: true, opacity: 0.9, depthWrite: false }));
  const fill = new THREE.Mesh(discGeo(r), basic(color, { transparent: true, opacity: 0.22, depthWrite: false }));
  rim.position.y = 0.06; fill.position.y = 0.05;
  g.add(fill, rim); g.visible = false; parent.add(g);
  g.userData = { rim, fill };
  g.place = (planet, dir) => { placeOn(g, planet, dir, 0); g.visible = true; };
  g.pulse = (k) => { rim.material.opacity = 0.5 + 0.5 * Math.abs(Math.sin(k)); };
  return g;
}

export function makeShadow(parent) {
  const m = new THREE.Mesh(discGeo(0.42), basic(0x1a1030, { transparent: true, opacity: 0.32, depthWrite: false }));
  m.renderOrder = 2; parent.add(m);
  return m;
}
export { surf };
