import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';

// Short-lived visual effects. Each effect is a function(dt) -> stillAlive.
export const FX = { list: [], group: null, decals: [] };
const sph = new THREE.SphereGeometry(1, 16, 12), cube = new THREE.BoxGeometry(1, 1, 1);
const decalGeo = new THREE.CircleGeometry(.07, 8);
const decalMat = new THREE.MeshBasicMaterial({ color: 0x1d1b16, transparent: true, opacity: .75, polygonOffset: true, polygonOffsetFactor: -4, depthWrite: false });

export function resetFX(group) { FX.list = []; FX.decals = []; FX.group = group; }
export function tickFX(dt) { FX.list = FX.list.filter(f => f(dt)); }

function kill(m) { FX.group.remove(m); if (m.material !== decalMat && m.material.dispose) m.material.dispose(); }

export function sparks(p, n = 6, color = 0xffc861, speed = 4) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(cube, new THREE.MeshBasicMaterial({ color, transparent: true }));
    m.scale.setScalar(.05 + Math.random() * .04); m.position.copy(p); FX.group.add(m);
    const v = new THREE.Vector3(Math.random() - .5, Math.random() * .8, Math.random() - .5).multiplyScalar(speed);
    let t = 0;
    FX.list.push(dt => { t += dt; v.y -= 12 * dt; m.position.addScaledVector(v, dt); m.material.opacity = 1 - t / .35; if (t > .35) { kill(m); return false; } return true; });
  }
}

export function decal(p, n) {
  const m = new THREE.Mesh(decalGeo, decalMat);
  m.position.copy(p).addScaledVector(n, .01); m.lookAt(p.clone().add(n)); FX.group.add(m);
  FX.decals.push(m); if (FX.decals.length > 80) FX.group.remove(FX.decals.shift());
}

export function tracer(a, b, color = 0xffd36b) {
  const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
  const l = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: .9 })); FX.group.add(l);
  let t = 0;
  FX.list.push(dt => { t += dt; l.material.opacity = .9 * (1 - t / .09); if (t > .09) { FX.group.remove(l); geo.dispose(); l.material.dispose(); return false; } return true; });
}

export function puff(p, size = 1, life = 2, color = 0x8c8274, rise = 1, opacity = .5) {
  const s = new THREE.Mesh(sph, new THREE.MeshLambertMaterial({ color, transparent: true, opacity, depthWrite: false }));
  s.position.copy(p); s.scale.setScalar(size * .5); FX.group.add(s);
  let t = 0;
  FX.list.push(dt => { t += dt; s.position.y += rise * dt; s.scale.multiplyScalar(1 + dt * .9); s.material.opacity = opacity * (1 - t / life); if (t > life) { kill(s); return false; } return true; });
}

export function fireball(p, size = 1, delay = 0) {
  let t = -delay;
  const ball = new THREE.Mesh(sph, new THREE.MeshBasicMaterial({ color: 0xfff1b0, transparent: true, fog: false, depthWrite: false }));
  ball.visible = false; ball.position.copy(p); FX.group.add(ball);
  const c1 = new THREE.Color(0xfff1b0), c2 = new THREE.Color(0xd2391b);
  const smoke = [], debris = [];
  let spawned = false;
  FX.list.push(dt => {
    t += dt; if (t < 0) return true;
    if (!spawned) {
      spawned = true; ball.visible = true;
      for (let i = 0; i < 7; i++) {
        const s = new THREE.Mesh(sph, new THREE.MeshLambertMaterial({ color: 0x8c8274, transparent: true, opacity: .55, depthWrite: false }));
        s.position.copy(p).add(new THREE.Vector3((Math.random() - .5) * 2 * size, Math.random() * size, (Math.random() - .5) * 2 * size));
        s.scale.setScalar(.6 * size); s.userData.v = .8 + Math.random() * 1.6; FX.group.add(s); smoke.push(s);
      }
      for (let i = 0; i < 12; i++) {
        const d = new THREE.Mesh(cube, new THREE.MeshLambertMaterial({ color: i % 3 ? 0x3a352b : 0x9e2b25 }));
        d.scale.setScalar(.1 + Math.random() * .2 * size); d.position.copy(p);
        d.userData.v = new THREE.Vector3(Math.random() - .5, .6 + Math.random(), Math.random() - .5).multiplyScalar(9 * Math.sqrt(size));
        FX.group.add(d); debris.push(d);
      }
    }
    const k = Math.min(1, t / .55);
    ball.scale.setScalar(size * (.4 + k * 2.2)); ball.material.opacity = 1 - k; ball.material.color.lerpColors(c1, c2, k);
    for (const s of smoke) { s.position.y += s.userData.v * dt; s.scale.multiplyScalar(1 + dt * .6); s.material.opacity = Math.max(0, .55 * (1 - t / 3)); }
    for (const d of debris) { const v = d.userData.v; v.y -= 20 * dt; d.position.addScaledVector(v, dt); if (d.position.y < .05) { d.position.y = .05; v.multiplyScalar(.3); v.y = Math.abs(v.y) * .3; } d.rotation.x += dt * 8; }
    if (t > 3) { kill(ball); smoke.forEach(kill); debris.forEach(kill); return false; }
    return true;
  });
}
