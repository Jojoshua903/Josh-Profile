import { THREE, scene, toon, addOutline } from './core.js?v=muis1';

export const LOOK_DEF = {
  hoodie: '#ff7a3d', pants: '#3a4a7a', hair: '#3b2a20', skin: '#f1c49b', shoes: '#f4f1ea', drone: '#14b8a6',
  hairStyle: 'kort', glasses: true, phones: true, pack: true, droneName: 'Byte',
};

export const M = {
  hoodie: toon(LOOK_DEF.hoodie), pants: toon(LOOK_DEF.pants), hair: toon(LOOK_DEF.hair),
  skin: toon(LOOK_DEF.skin), shoes: toon(LOOK_DEF.shoes), drone: toon(LOOK_DEF.drone),
  dark: toon(0x2b2440), white: toon(0xfbf7ef), cheek: toon(0xff9a8a),
};
const glow = new THREE.MeshBasicMaterial({ color: 0x5ef2e0 });
const ink = new THREE.MeshBasicMaterial({ color: 0x2b2440 });

function mk(geo, mat, x, y, z, parent, ol = true, olScale = 1.08) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  if (ol) addOutline(m, olScale);
  return m;
}

export function buildJosh() {
  const root = new THREE.Group();          // feet origin, squash/stretch
  const pivot = new THREE.Group();         // rotation point at hip height (flips, leans)
  pivot.position.y = 0.8;
  const body = new THREE.Group();
  body.position.y = -0.8;
  root.add(pivot); pivot.add(body);
  scene.add(root);

  const legs = [-1, 1].map((s) => {
    const p = new THREE.Group(); p.position.set(0.13 * s, 0.68, 0); body.add(p);
    mk(new THREE.CapsuleGeometry(0.105, 0.36, 4, 10), M.pants, 0, -0.3, 0, p);
    mk(new THREE.BoxGeometry(0.22, 0.13, 0.32), M.shoes, 0, -0.62, 0.04, p, true, 1.12);
    return p;
  });

  const torso = mk(new THREE.CapsuleGeometry(0.27, 0.28, 6, 14), M.hoodie, 0, 0.98, 0, body);
  torso.scale.set(1.05, 1, 0.85);
  mk(new THREE.SphereGeometry(0.2, 14, 10), M.hoodie, 0, 1.3, -0.17, body);           // hood
  [-1, 1].forEach((s) => mk(new THREE.CylinderGeometry(0.014, 0.014, 0.18), M.white, 0.07 * s, 1.15, 0.235, body, false));
  const logo = new THREE.Mesh(new THREE.CircleGeometry(0.065, 6), glow);               // little chip logo
  logo.position.set(0, 1.0, 0.235); body.add(logo);

  const arms = [-1, 1].map((s) => {
    const p = new THREE.Group(); p.position.set(0.33 * s, 1.25, 0); body.add(p);
    mk(new THREE.CapsuleGeometry(0.085, 0.3, 4, 10), M.hoodie, 0, -0.22, 0, p);
    mk(new THREE.SphereGeometry(0.095, 12, 8), M.skin, 0, -0.46, 0, p);
    return p;
  });

  const head = new THREE.Group(); head.position.y = 1.58; body.add(head);
  mk(new THREE.SphereGeometry(0.3, 22, 16), M.skin, 0, 0, 0, head, true, 1.06);
  [-1, 1].forEach((s) => {
    mk(new THREE.SphereGeometry(0.07, 10, 8), M.skin, 0.29 * s, -0.01, 0, head);
    const eye = new THREE.Mesh(new THREE.CapsuleGeometry(0.034, 0.05, 4, 8), ink);
    eye.position.set(0.1 * s, 0.02, 0.27); head.add(eye);
    const ch = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), M.cheek);
    ch.position.set(0.17 * s, -0.08, 0.24); ch.scale.z = 0.4; head.add(ch);
  });
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 6, 12, Math.PI), ink);
  mouth.position.set(0, -0.1, 0.285); mouth.rotation.z = Math.PI; head.add(mouth);

  const glasses = new THREE.Group(); head.add(glasses);
  [-1, 1].forEach((s) => {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.018, 8, 20), M.dark);
    r.position.set(0.1 * s, 0.02, 0.29); glasses.add(r);
  });
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.016, 0.016), M.dark);
  bridge.position.set(0, 0.035, 0.3); glasses.add(bridge);

  const hair = { kort: new THREE.Group(), spiky: new THREE.Group(), muts: new THREE.Group() };
  Object.values(hair).forEach((g) => head.add(g));
  const cap = mk(new THREE.SphereGeometry(0.318, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), M.hair, 0, 0.03, -0.02, hair.kort, true, 1.05);
  cap.rotation.x = -0.28;
  mk(new THREE.BoxGeometry(0.42, 0.08, 0.12), M.hair, 0.02, 0.2, 0.22, hair.kort, false).rotation.z = 0.12;
  mk(new THREE.SphereGeometry(0.31, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.45), M.hair, 0, 0.02, -0.02, hair.spiky, false);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const c = mk(new THREE.ConeGeometry(0.08, 0.26, 6), M.hair, Math.cos(a) * 0.16, 0.3, Math.sin(a) * 0.16 - 0.03, hair.spiky);
    c.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6);
  }
  mk(new THREE.SphereGeometry(0.33, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), M.hair, 0, 0.05, 0, hair.muts, true, 1.05);
  const rim = mk(new THREE.TorusGeometry(0.315, 0.055, 8, 28), M.white, 0, 0.07, 0, hair.muts, false);
  rim.rotation.x = Math.PI / 2;
  mk(new THREE.SphereGeometry(0.085, 10, 8), M.white, 0, 0.4, 0, hair.muts);

  const phones = new THREE.Group(); head.add(phones);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.03, 8, 24, Math.PI), M.dark);
  band.position.y = 0.02; phones.add(band);
  [-1, 1].forEach((s) => {
    const cup = mk(new THREE.CylinderGeometry(0.11, 0.11, 0.09, 16), M.drone, 0.33 * s, 0, 0, phones);
    cup.rotation.z = Math.PI / 2;
  });

  const pack = new THREE.Group(); body.add(pack);
  mk(new THREE.BoxGeometry(0.38, 0.42, 0.18), M.dark, 0, 1.0, -0.3, pack, true, 1.06);
  mk(new THREE.BoxGeometry(0.2, 0.08, 0.02), M.drone, 0, 1.08, -0.4, pack, false);
  mk(new THREE.CylinderGeometry(0.014, 0.014, 0.32), M.dark, 0.12, 1.36, -0.3, pack, false);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), glow);
  tip.position.set(0.12, 1.53, -0.3); pack.add(tip);

  root.traverse((o) => { if (o.isMesh && o.material !== ink) o.castShadow = true; });
  return { root, pivot, body, legs, arms, torso, head, glasses, hair, phones, pack, tip };
}

export function buildDrone() {
  const g = new THREE.Group();
  scene.add(g);
  const tilt = new THREE.Group(); g.add(tilt);
  mk(new THREE.SphereGeometry(0.2, 18, 14), M.white, 0, 0, 0, tilt, true, 1.1);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 10), M.dark);
  visor.position.set(0, 0.02, 0.13); visor.scale.set(1, 0.75, 0.6); tilt.add(visor);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x5ef2e0 });
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), eyeMat);
  eye.position.set(0, 0.03, 0.21); tilt.add(eye);
  const ring = mk(new THREE.TorusGeometry(0.28, 0.035, 8, 28), M.drone, 0, 0, 0, tilt, false);
  ring.rotation.x = Math.PI / 2;
  const props = [-1, 1].map((s) => {
    mk(new THREE.CylinderGeometry(0.015, 0.015, 0.14), M.dark, 0.2 * s, 0.14, 0, tilt, false);
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.012, 0.05), M.dark);
    p.position.set(0.2 * s, 0.22, 0); tilt.add(p);
    return p;
  });
  // Scan beam: thin end at drone, wide end at target (+z)
  const beamGeo = new THREE.CylinderGeometry(0.7, 0.03, 1, 20, 1, true);
  beamGeo.rotateX(Math.PI / 2); beamGeo.translate(0, 0, 0.5);
  const beamMat = new THREE.MeshBasicMaterial({ color: 0x5ef2e0, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.visible = false; scene.add(beam);
  return { g, tilt, eyeMat, props, beam, beamMat };
}
