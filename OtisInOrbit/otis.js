import { THREE, scene, toon, addOutline, V3, damp, clamp } from './core.js?v=muis1';

// Otis: astronaut dog and pilot. He stays near the rocket, but reacts to everything around him.
// Moods: idle (wag, sniff, scratch), bark, happy (hopping), shake (shaking off dust).
export function buildOtis(groundAt) {
  const root = new THREE.Group(); scene.add(root);
  const body = new THREE.Group(); root.add(body);
  const fur = toon(0xc98a4b), dark = toon(0x6b4226), cream = toon(0xf5e1c8), suit = toon(0xf4f1ea), orange = toon(0xff7a3d);
  const ink = new THREE.MeshBasicMaterial({ color: 0x2b2440 });
  const mk = (geo, mat, x, y, z, parent = body, ol = 1.08) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true;
    if (ol) addOutline(m, ol); parent.add(m); return m;
  };

  const torso = mk(new THREE.CapsuleGeometry(0.24, 0.4, 6, 12), suit, 0, 0.52, 0);
  torso.rotation.x = Math.PI / 2;
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.04, 6, 20), orange);
  belt.position.set(0, 0.52, 0.08); body.add(belt);
  mk(new THREE.BoxGeometry(0.28, 0.16, 0.3), orange, 0, 0.8, -0.06, body, 1.1);            // oxygen pack
  const legs = [[-0.14, 0.22], [0.14, 0.22], [-0.14, -0.2], [0.14, -0.2]].map(([x, z]) => {
    const p = new THREE.Group(); p.position.set(x, 0.4, z); body.add(p);
    mk(new THREE.CapsuleGeometry(0.07, 0.2, 4, 8), suit, 0, -0.17, 0, p);
    mk(new THREE.SphereGeometry(0.085, 10, 8), fur, 0, -0.34, 0.02, p);
    return p;
  });
  const tail = new THREE.Group(); tail.position.set(0, 0.62, -0.4); body.add(tail);
  mk(new THREE.CapsuleGeometry(0.05, 0.22, 4, 8), fur, 0, 0.12, -0.05, tail).rotation.x = -0.6;

  const head = new THREE.Group(); head.position.set(0, 0.9, 0.34); body.add(head);
  mk(new THREE.SphereGeometry(0.23, 18, 14), fur, 0, 0, 0, head, 1.06);
  mk(new THREE.SphereGeometry(0.13, 14, 10), cream, 0, -0.07, 0.18, head).scale.set(1.15, 0.8, 1);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 6), ink); nose.position.set(0, -0.03, 0.31); head.add(nose);
  [-1, 1].forEach((s) => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 6), ink); e.position.set(0.09 * s, 0.05, 0.2); head.add(e);
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    hl.position.set(0.095 * s + 0.01, 0.065, 0.235); head.add(hl);
  });
  const ears = [-1, 1].map((s) => {
    const p = new THREE.Group(); p.position.set(0.17 * s, 0.1, -0.02); head.add(p);
    mk(new THREE.SphereGeometry(0.11, 10, 8), dark, 0, -0.11, 0, p).scale.set(0.45, 1.25, 0.8);
    p.rotation.z = 0.3 * s;
    return { p, s };
  });
  const tongue = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), toon(0xff7a8a));
  tongue.position.set(0, -0.17, 0.25); tongue.scale.set(1, 0.4, 1.3); head.add(tongue);
  // the astronaut helmet
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.37, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.16, depthWrite: false }));
  head.add(glass);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.045, 8, 24), toon(0xd0d4dc));
  rim.rotation.x = Math.PI / 2; rim.position.y = -0.25; head.add(rim);
  const glare = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.012, 4, 16, 1.1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }));
  glare.position.set(0, 0.03, 0.05); glare.rotation.set(0, -0.5, 2.1); head.add(glare);

  const o = {
    root, body, head, mood: 'idle', moodT: 0, walk: null, phase: 0, idleT: 3, idleAct: null, actT: 0, hop: 0, vy: 0, air: false,
    setMood(m, dur = 1.5) { o.mood = m; o.moodT = dur; },
    walkTo(target, speed = 3.2, onArrive) { o.walk = { target: target.clone(), speed, onArrive }; },
    jump(vy = 5) { o.vy = vy; o.air = true; },
    place(x, z) { root.position.set(x, groundAt(x, z, 0.3), z); },
  };

  o.update = (dt, t, lookAt) => {
    const pos = root.position;
    o.moodT -= dt;
    if (o.mood !== 'idle' && o.moodT <= 0) o.mood = 'idle';

    let moving = false;
    if (o.walk) {
      const d = V3(o.walk.target.x - pos.x, 0, o.walk.target.z - pos.z);
      const len = d.length();
      if (len > 0.12) {
        d.multiplyScalar(Math.min(1, (o.walk.speed * dt) / len));
        pos.x += d.x; pos.z += d.z; moving = true;
        let dy = Math.atan2(d.x, d.z) - root.rotation.y;
        root.rotation.y += Math.atan2(Math.sin(dy), Math.cos(dy)) * damp(10, dt);
      } else { const cb = o.walk.onArrive; o.walk = null; cb && cb(); }
    } else if (lookAt) {
      let dy = Math.atan2(lookAt.x - pos.x, lookAt.z - pos.z) - root.rotation.y;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      if (Math.abs(dy) > 1.1) root.rotation.y += dy * damp(2, dt);   // turn body only for big angles
      head.rotation.y += (clamp(dy, -0.8, 0.8) - head.rotation.y) * damp(6, dt);
    }

    // simple vertical physics for hops and jumping out of / into the rocket
    const g = groundAt(pos.x, pos.z, 0.3);
    if (o.air) { o.vy -= 22 * dt; pos.y += o.vy * dt; if (pos.y <= g && o.vy < 0) { pos.y = g; o.air = false; } }
    else pos.y += (g - pos.y) * damp(12, dt);

    // idle quirks every few seconds
    if (o.mood === 'idle' && !moving) {
      o.idleT -= dt;
      if (o.idleT <= 0) { o.idleAct = ['sniff', 'scratch', 'look', 'sniff'][Math.floor(Math.random() * 4)]; o.actT = 1.4; o.idleT = 4 + Math.random() * 4; }
    }
    o.actT -= dt;
    const act = o.actT > 0 && o.mood === 'idle' && !moving ? o.idleAct : null;

    // pose targets
    const k = damp(10, dt);
    let headX = 0, bodyZ = 0, wag = Math.sin(t * 9) * 0.5, hop = 0;
    if (moving) { o.phase += dt * 16; hop = Math.abs(Math.sin(o.phase)) * 0.06; }
    if (act === 'sniff') { headX = 0.55; head.position.y = 0.82; }
    else head.position.y += (0.9 - head.position.y) * k;
    if (act === 'scratch') { legs[3].rotation.x = -1 + Math.sin(t * 30) * 0.5; ears[0].p.rotation.x = Math.sin(t * 30) * 0.2; }
    if (act === 'look') headX = -0.35;
    if (o.mood === 'happy') { hop = Math.abs(Math.sin(t * 11)) * 0.35; wag = Math.sin(t * 22) * 0.9; root.rotation.y += dt * 1.2; }
    if (o.mood === 'bark') { headX = -0.4 + Math.abs(Math.sin(t * 14)) * 0.3; hop = Math.abs(Math.sin(t * 14)) * 0.08; }
    if (o.mood === 'shake') { bodyZ = Math.sin(t * 40) * 0.35; wag = Math.sin(t * 40); }

    head.rotation.x += (headX - head.rotation.x) * k;
    body.rotation.z += (bodyZ - body.rotation.z) * damp(20, dt);
    body.position.y = hop + Math.sin(t * 3) * 0.008;
    tail.rotation.y = wag;
    tongue.visible = o.mood === 'happy' || o.mood === 'bark' || moving;
    legs.forEach((l, i) => {
      if (act === 'scratch' && i === 3) return;
      const sw = moving ? Math.sin(o.phase + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * 0.7 : 0;
      l.rotation.x += (sw - l.rotation.x) * damp(18, dt);
    });
    ears.forEach(({ p, s }) => {
      p.rotation.z = 0.3 * s + (o.mood === 'shake' ? Math.sin(t * 40) * 0.5 : Math.sin(t * 2 + s) * 0.05);
      if (act !== 'scratch') p.rotation.x += (0 - p.rotation.x) * k;
    });
  };
  return o;
}
