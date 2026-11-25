import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';

// Extra particle effects: sparks, smoke, cast auras and a pooled light for explosions.
// Everything lives in G.fx and is aged out by updateFx in units.js.

const SPARK = new THREE.PlaneGeometry(0.09, 0.32), PUFF = new THREE.SphereGeometry(1, 8, 6), MOTE = new THREE.OctahedronGeometry(0.09, 0);
const add = (G, mesh, f) => { G.scene.add(mesh); G.fx.push({ obj: mesh, shared: true, ...f }); };
const glow = color => new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });

export function sparks(G, p, color, n = 8, speed = 7) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(SPARK, glow(i % 3 ? color : 0xffffff));
    m.position.copy(p);
    const v = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8 + 0.2, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.5 + Math.random() * 0.7));
    m.lookAt(p.clone().add(v));
    add(G, m, { life: 0.35 + Math.random() * 0.25, max: 0.6, kind: 'spark', vel: v });
  }
}

export function smoke(G, p, n = 5, color = 0x8a8f99, size = 0.6) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(PUFF, new THREE.MeshLambertMaterial({ color, transparent: true, depthWrite: false }));
    m.position.set(p.x + (Math.random() - 0.5) * size * 2, p.y + Math.random() * size, p.z + (Math.random() - 0.5) * size * 2);
    m.scale.setScalar(size * (0.5 + Math.random() * 0.5));
    add(G, m, { life: 0.9 + Math.random() * 0.5, max: 1.4, kind: 'smoke', grow: size * 1.6, vel: new THREE.Vector3((Math.random() - 0.5) * 1.5, 1.4 + Math.random(), (Math.random() - 0.5) * 1.5) });
  }
}

// One shared light that flashes at explosions and ultimates.
export function lightFlash(G, p, color, power = 6) {
  if (!G.flashLight) { G.flashLight = new THREE.PointLight(0xffffff, 0, 22, 1.6); G.scene.add(G.flashLight); }
  const L = G.flashLight;
  if (L.intensity > power) return;
  L.color.set(color); L.position.set(p.x, p.y + 1.2, p.z); L.intensity = power;
}

// Big blast: flash, sparks, smoke and a light pop.
export function blast(G, p, color, r) {
  sparks(G, p, color, Math.min(18, 6 + Math.round(r * 2)), 6 + r * 1.5);
  smoke(G, p, Math.min(7, 2 + Math.round(r)), 0x8a8f99, Math.min(1.4, 0.35 + r * 0.18));
  lightFlash(G, p, color, 3 + r * 1.2);
}

// Every cast: hero-coloured motes spiral up around the caster; ultimates add a light column.
export function castFx(G, h, slot) {
  const c = h.def.color, ult = slot === 'ult', n = ult ? 18 : 9;
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(MOTE, glow(i % 3 ? c : 0xffffff));
    const ang = (i / n) * Math.PI * 2;
    m.position.set(h.pos.x + Math.cos(ang) * 0.8, h.pos.y + 0.2, h.pos.z + Math.sin(ang) * 0.8);
    add(G, m, { life: 0.7, max: 0.7, kind: 'mote', ang, cx: h.pos.x, cz: h.pos.z, y0: h.pos.y, r: 0.8, rise: ult ? 4 : 2.4 });
  }
  const disc = new THREE.Mesh(new THREE.RingGeometry(0.2, 1, 32), glow(c));
  disc.rotation.x = -Math.PI / 2; disc.position.set(h.pos.x, h.pos.y + 0.08, h.pos.z);
  G.scene.add(disc); G.fx.push({ obj: disc, life: 0.5, max: 0.5, kind: 'grow', size: ult ? 3.4 : 1.8 });
  if (ult) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.2, 14, 20, 1, true), glow(c));
    col.position.set(h.pos.x, h.pos.y + 7, h.pos.z);
    G.scene.add(col); G.fx.push({ obj: col, life: 0.8, max: 0.8, kind: 'column' });
    lightFlash(G, h.pos, c, 7);
  }
}

// Ages the kinds above. Called from updateFx before the shared fade/removal.
export function tickVfx(G, f, dt, k) {
  if (f.kind === 'spark') { f.vel.y -= 14 * dt; f.obj.position.addScaledVector(f.vel, dt); f.obj.scale.setScalar(Math.max(0.05, k)); return true; }
  if (f.kind === 'smoke') { f.obj.position.addScaledVector(f.vel, dt); f.vel.multiplyScalar(1 - dt * 1.5); f.obj.scale.addScalar(dt * f.grow); f.obj.material.opacity = Math.min(0.55, k * 0.8); return true; }
  if (f.kind === 'mote') {
    const t = 1 - k; f.ang += dt * 7;
    const r = f.r * (1 - t * 0.6);
    f.obj.position.set(f.cx + Math.cos(f.ang) * r, f.y0 + 0.2 + t * f.rise, f.cz + Math.sin(f.ang) * r);
    f.obj.rotation.y += dt * 9; f.obj.material.opacity = Math.min(1, k * 2.5);
    return true;
  }
  if (f.kind === 'column') { f.obj.scale.set(1 - (1 - k) * 0.7, 1, 1 - (1 - k) * 0.7); f.obj.material.opacity = k * 0.55; return true; }
  return false;
}
export function tickLight(G, dt) {
  if (G.flashLight && G.flashLight.intensity > 0.01) G.flashLight.intensity *= Math.exp(-dt * 9);
}
