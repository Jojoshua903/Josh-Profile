import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';

// One instanced pool for every particle (confetti, splashes, dust, juice) plus floating "+10" popups.
export function createFX(scene) {
  const MAX = 700;
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.05 });
  const inst = new THREE.InstancedMesh(geo, mat, MAX);
  inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  inst.frustumCulled = false;
  scene.add(inst);
  const zero = new THREE.Matrix4().makeScale(0, 0, 0), col = new THREE.Color(), q = new THREE.Quaternion(), s = new THREE.Vector3(), mtx = new THREE.Matrix4();
  const P = [];
  for (let i = 0; i < MAX; i++) { inst.setMatrixAt(i, zero); inst.setColorAt(i, col.set(0xffffff)); P.push({ alive: false, p: new THREE.Vector3(), v: new THREE.Vector3(), axis: new THREE.Vector3(1, 0, 0), age: 0 }); }
  let cursor = 0, dirtyColor = false;

  function burst(pos, o = {}) {
    const { count = 20, colors = [0xffffff], speed = 3, up = 2, gravity = 9.8, size = 0.05, life = 1.2, drag = 1, flutter = 0, flat = false, spread = 1 } = o;
    for (let k = 0; k < count; k++) {
      const pt = P[cursor], i = cursor; cursor = (cursor + 1) % MAX;
      pt.alive = true; pt.age = 0; pt.life = life * (0.7 + Math.random() * 0.6);
      pt.p.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * spread * 0.3, 0, (Math.random() - 0.5) * spread * 0.3));
      const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.6, Math.random() - 0.5).normalize();
      pt.v.copy(dir).multiplyScalar(speed * (0.4 + Math.random() * 0.8)); pt.v.y += up * (0.5 + Math.random() * 0.7);
      pt.g = gravity; pt.drag = drag; pt.flutter = flutter; pt.size = size * (0.6 + Math.random() * 0.8); pt.flat = flat;
      pt.axis.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(); pt.spin = 4 + Math.random() * 10;
      pt.ph = Math.random() * 6;
      inst.setColorAt(i, col.set(colors[Math.floor(Math.random() * colors.length)])); dirtyColor = true;
    }
  }
  const CONFETTI = [0xff6b4f, 0xffc93c, 0x13a9c2, 0x2f9e5b, 0xff4f8b, 0xffffff, 0x8a5cff];
  const fx = {
    burst,
    confetti: (pos, n = 140) => burst(pos, { count: n, colors: CONFETTI, speed: 4, up: 6, gravity: 2.6, size: 0.07, life: 3, drag: 1.4, flutter: 1.6, flat: true, spread: 3 }),
    splash: (pos, n = 26) => burst(pos, { count: n, colors: [0xffffff, 0xdff6fb, 0x9be3ee], speed: 2.2, up: 3.5, gravity: 9.8, size: 0.09, life: 0.9, drag: 0.6 }),
    dust: (pos, n = 14, c = 0xe9d3a0) => burst(pos, { count: n, colors: [c, 0xffffff], speed: 1.4, up: 0.8, gravity: 1.5, size: 0.06, life: 0.8, drag: 3 }),
    juice: (pos, c) => burst(pos, { count: 16, colors: [c, 0xffffff], speed: 2.4, up: 1.5, gravity: 7, size: 0.045, life: 0.8 }),
    sparks: (pos) => burst(pos, { count: 30, colors: [0xffc93c, 0xff6b4f, 0xfff3b0], speed: 4.5, up: 2, gravity: 6, size: 0.04, life: 0.7 }),
  };

  // floating text
  const pops = [];
  fx.popup = (text, pos, color = '#ffc93c') => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 160;
    const g = c.getContext('2d');
    g.font = '900 120px ui-rounded, "Arial Rounded MT Bold", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 18; g.strokeStyle = '#123247'; g.strokeText(text, 256, 84); g.fillStyle = color; g.fillText(text, 256, 84);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    sp.renderOrder = 998; sp.position.copy(pos); sp.scale.set(1.6, 0.5, 1);
    scene.add(sp); pops.push({ sp, age: 0 });
  };

  fx.update = (dt) => {
    for (let i = 0; i < MAX; i++) {
      const pt = P[i]; if (!pt.alive) continue;
      pt.age += dt;
      if (pt.age >= pt.life) { pt.alive = false; inst.setMatrixAt(i, zero); continue; }
      pt.v.y -= pt.g * dt; pt.v.multiplyScalar(Math.exp(-pt.drag * dt));
      if (pt.flutter) { pt.v.x += Math.sin(pt.age * 6 + pt.ph) * pt.flutter * dt; pt.v.z += Math.cos(pt.age * 5 + pt.ph) * pt.flutter * dt; }
      pt.p.addScaledVector(pt.v, dt);
      if (pt.p.y < -0.55 && pt.g > 3) { pt.alive = false; inst.setMatrixAt(i, zero); continue; }
      const k = Math.min(1, (pt.life - pt.age) / (pt.life * 0.35));
      q.setFromAxisAngle(pt.axis, pt.age * pt.spin);
      s.set(pt.size * k, pt.size * k * (pt.flat ? 0.12 : 1), pt.size * k * (pt.flat ? 1.6 : 1));
      inst.setMatrixAt(i, mtx.compose(pt.p, q, s));
    }
    inst.instanceMatrix.needsUpdate = true;
    if (dirtyColor) { inst.instanceColor.needsUpdate = true; dirtyColor = false; }
    for (let i = pops.length - 1; i >= 0; i--) {
      const p = pops[i]; p.age += dt;
      p.sp.position.y += dt * 0.9;
      const sc = p.age < 0.15 ? p.age / 0.15 : 1; p.sp.scale.set(1.6 * sc, 0.5 * sc, 1);
      p.sp.material.opacity = Math.max(0, 1 - Math.max(0, p.age - 0.7) / 0.5);
      if (p.age > 1.2) { scene.remove(p.sp); p.sp.material.map.dispose(); p.sp.material.dispose(); pops.splice(i, 1); }
    }
  };
  fx.clear = () => { P.forEach((pt, i) => { pt.alive = false; inst.setMatrixAt(i, zero); }); inst.instanceMatrix.needsUpdate = true; };
  return fx;
}
