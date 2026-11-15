import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';

// Chunky, Mii-style figures: big head, eyes that follow the camera, arms that cheer, wave or droop.
const list = [];
const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: o.r ?? 0.55, metalness: o.m ?? 0, ...(o.x || {}) });
function mk(geo, color, o) { const m = new THREE.Mesh(geo, mat(color, o)); m.castShadow = true; m.receiveShadow = true; return m; }

function nameTag(text, color) {
  const c = document.createElement('canvas'); c.width = 640; c.height = 140;
  const g = c.getContext('2d');
  g.font = '900 60px ui-rounded, "Arial Rounded MT Bold", sans-serif';
  const w = Math.min(620, g.measureText(text).width + 130);
  g.fillStyle = '#fff4dc'; g.strokeStyle = '#123247'; g.lineWidth = 8;
  g.beginPath(); g.roundRect((640 - w) / 2, 18, w, 100, 50); g.fill(); g.stroke();
  g.fillStyle = '#' + color.toString(16).padStart(6, '0'); g.beginPath(); g.arc((640 - w) / 2 + 52, 68, 24, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = '#123247'; g.textBaseline = 'middle'; g.fillText(text, (640 - w) / 2 + 90, 70);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  s.scale.set(1.75, 0.38, 1); return s;
}

export function makeCharacter({ name, body = 0x13a9c2, skin = 0xf2c9a0, hat = 'none', hatColor = 0xff6b4f, mustache = false, pants = 0x123247 }) {
  const g = new THREE.Group();
  const rig = new THREE.Group(); g.add(rig);
  // legs + shoes
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(s * 0.12, 0.48, 0);
    const l = mk(new THREE.CapsuleGeometry(0.085, 0.3, 4, 10), pants); l.position.y = -0.2; leg.add(l);
    const shoe = mk(new THREE.SphereGeometry(0.11, 14, 10), 0xffffff, { r: 0.4 }); shoe.scale.set(1, 0.6, 1.45); shoe.position.set(0, -0.42, 0.05); leg.add(shoe);
    rig.add(leg); legs.push(leg);
  }
  const torso = mk(new THREE.CapsuleGeometry(0.25, 0.32, 8, 18), body, { r: 0.6 }); torso.position.y = 0.78; torso.scale.set(1, 1, 0.85); rig.add(torso);
  const belt = mk(new THREE.TorusGeometry(0.235, 0.03, 8, 24), pants); belt.rotation.x = Math.PI / 2; belt.position.y = 0.6; belt.scale.set(1, 0.85, 1); rig.add(belt);
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(s * 0.3, 1.0, 0);
    const a = mk(new THREE.CapsuleGeometry(0.07, 0.3, 4, 10), body, { r: 0.6 }); a.position.y = -0.21; arm.add(a);
    const hand = mk(new THREE.SphereGeometry(0.085, 12, 10), skin); hand.position.y = -0.43; arm.add(hand);
    arm.rotation.z = s * 0.18; rig.add(arm); arms.push(arm);
  }
  // head
  const head = new THREE.Group(); head.position.y = 1.38; rig.add(head);
  const skull = mk(new THREE.SphereGeometry(0.3, 28, 20), skin, { r: 0.5 }); skull.scale.set(1, 0.98, 0.95); head.add(skull);
  for (const s of [-1, 1]) {
    const ear = mk(new THREE.SphereGeometry(0.06, 10, 8), skin); ear.position.set(s * 0.29, -0.01, 0); ear.scale.set(0.6, 1, 1); head.add(ear);
    const white = mk(new THREE.SphereGeometry(0.062, 14, 10), 0xffffff, { r: 0.2 }); white.position.set(s * 0.105, 0.03, 0.255); white.scale.set(1, 1.25, 0.55); head.add(white);
    const pupil = mk(new THREE.SphereGeometry(0.036, 12, 8), 0x1b2430, { r: 0.1 }); pupil.position.set(s * 0.105, 0.025, 0.29); pupil.scale.set(1, 1.3, 0.5); head.add(pupil);
    const shine = mk(new THREE.SphereGeometry(0.011, 6, 4), 0xffffff, { x: { emissive: 0xffffff } }); shine.position.set(s * 0.105 + 0.012, 0.05, 0.305); head.add(shine);
    const brow = mk(new THREE.CapsuleGeometry(0.014, 0.07, 3, 6), 0x3a2416); brow.rotation.z = Math.PI / 2 + s * 0.12; brow.position.set(s * 0.105, 0.135, 0.27); head.add(brow);
    const blush = mk(new THREE.SphereGeometry(0.045, 10, 6), 0xff8a8a, { x: { transparent: true, opacity: 0.45 } }); blush.position.set(s * 0.17, -0.06, 0.235); blush.scale.set(1, 0.6, 0.3); head.add(blush);
  }
  const nose = mk(new THREE.SphereGeometry(0.04, 10, 8), skin); nose.position.set(0, -0.02, 0.29); head.add(nose);
  const mouth = mk(new THREE.TorusGeometry(0.06, 0.013, 6, 16, Math.PI), 0x7a2a2a); mouth.position.set(0, -0.1, 0.27); mouth.rotation.z = Math.PI; head.add(mouth);
  if (mustache) for (const s of [-1, 1]) { const mu = mk(new THREE.CapsuleGeometry(0.025, 0.07, 3, 8), 0x3a2416); mu.rotation.z = Math.PI / 2 + s * 0.35; mu.position.set(s * 0.045, -0.06, 0.29); head.add(mu); }
  const H = (geo, color, y, z = 0, o) => { const h = mk(geo, color, o); h.position.set(0, y, z); head.add(h); return h; };
  if (hat === 'cap') { H(new THREE.SphereGeometry(0.31, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), hatColor, 0.04); H(new THREE.CylinderGeometry(0.2, 0.2, 0.025, 20, 1, false, -Math.PI / 2, Math.PI), hatColor, 0.06, 0.18).scale.z = 1.4; const em = H(new THREE.CircleGeometry(0.07, 16), 0xffffff, 0.18, 0.28); em.rotation.x = -0.5; }
  if (hat === 'detective') { H(new THREE.CylinderGeometry(0.45, 0.45, 0.03, 24), hatColor, 0.2); H(new THREE.CylinderGeometry(0.24, 0.27, 0.22, 20), hatColor, 0.31); H(new THREE.CylinderGeometry(0.275, 0.275, 0.05, 20), 0x2a1a0e, 0.23); }
  if (hat === 'captain') { H(new THREE.CylinderGeometry(0.34, 0.29, 0.16, 20), 0xffffff, 0.26); H(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 20), hatColor, 0.2); const v = H(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 20, 1, false, -Math.PI / 2, Math.PI), 0x123247, 0.18, 0.2); v.scale.z = 1.3; H(new THREE.SphereGeometry(0.035, 8, 6), 0xffc93c, 0.27, 0.3); }
  if (hat === 'helmet') { H(new THREE.SphereGeometry(0.4, 28, 18), 0xdff4ff, 0, 0, { r: 0.05, m: 0.1, x: { transparent: true, opacity: 0.28 } }); const r = H(new THREE.TorusGeometry(0.33, 0.05, 8, 28), hatColor, -0.27, 0, { m: 0.3, r: 0.3 }); r.rotation.x = Math.PI / 2; H(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 5), 0xcccccc, 0.45); H(new THREE.SphereGeometry(0.035, 8, 6), 0xff6b4f, 0.56, 0, { x: { emissive: 0xff3b2f, emissiveIntensity: 1 } }); }
  if (hat === 'ninja') { const b = H(new THREE.TorusGeometry(0.3, 0.04, 8, 28), hatColor, 0.12); b.rotation.x = Math.PI / 2; for (const s of [-1, 1]) { const tail = mk(new THREE.BoxGeometry(0.04, 0.22, 0.02), hatColor); tail.position.set(s * 0.05, 0.02, -0.32); tail.rotation.z = s * 0.4; head.add(tail); } const mask = H(new THREE.SphereGeometry(0.305, 24, 12, 0, Math.PI * 2, Math.PI * 0.52, Math.PI * 0.3), 0x26313a); mask.position.y = 0.0; mouth.visible = false; nose.visible = false; }
  if (hat === 'goggles') { const b = H(new THREE.TorusGeometry(0.3, 0.03, 6, 28), 0x7a4a2a, 0.14); b.rotation.x = Math.PI / 2; for (const s of [-1, 1]) { const l = mk(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 18), hatColor, { m: 0.7, r: 0.15 }); l.rotation.x = Math.PI / 2 - 0.4; l.position.set(s * 0.1, 0.2, 0.24); head.add(l); } }
  if (hat === 'horns') { for (const s of [-1, 1]) { const h = mk(new THREE.ConeGeometry(0.07, 0.26, 12), hatColor); h.position.set(s * 0.17, 0.3, 0); h.rotation.z = -s * 0.4; head.add(h); } const tail = mk(new THREE.ConeGeometry(0.05, 0.3, 8), hatColor); tail.position.set(0, 0.65, -0.28); tail.rotation.x = -2.2; rig.add(tail); }
  if (hat === 'hardhat') { H(new THREE.SphereGeometry(0.32, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), hatColor, 0.05, 0, { r: 0.35 }); H(new THREE.CylinderGeometry(0.38, 0.38, 0.03, 24), hatColor, 0.06, 0.02, { r: 0.35 }); H(new THREE.BoxGeometry(0.05, 0.05, 0.6), hatColor, 0.3); }
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.38, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.015; g.add(shadow);
  const tag = nameTag(name, body); tag.position.y = 2.1; g.add(tag);
  g.userData.character = { rig, head, arms, legs, mouth, phase: Math.random() * 6, react: null, t: 0 };
  list.push(g);
  return g;
}

export function clearCharacters() { list.length = 0; }
export function reactAll(kind) { list.forEach((c) => { c.userData.character.react = kind; c.userData.character.t = 0; }); }

const tmp = new THREE.Vector3();
export function updateCharacters(dt, t, camera) {
  const camPos = camera.getWorldPosition(tmp);
  list.forEach((c) => {
    const d = c.userData.character; d.t += dt;
    const breathe = Math.sin(t * 2 + d.phase);
    let jump = 0, armL = 0.18, armR = -0.18, headTilt = Math.sin(t * 1.2 + d.phase) * 0.08, nod = 0, mouthS = 1;
    if (d.react === 'cheer') {
      const k = d.t * 7; jump = Math.abs(Math.sin(k)) * 0.35; armL = 2.7 + Math.sin(k * 2) * 0.25; armR = -armL; mouthS = 1.6;
      if (d.t > 1.8) d.react = null;
    } else if (d.react === 'happy') {
      jump = Math.abs(Math.sin(d.t * 9)) * 0.14 * Math.max(0, 1 - d.t); armR = -2.4 + Math.sin(d.t * 14) * 0.4; mouthS = 1.3;
      if (d.t > 1.1) d.react = null;
    } else if (d.react === 'sad') {
      nod = 0.35; armL = 0.05; armR = -0.05; mouthS = -1; headTilt *= 0.3;
      if (d.t > 1.6) d.react = null;
    }
    d.rig.position.y = jump + breathe * 0.008;
    d.arms[0].rotation.z += (-armL - d.arms[0].rotation.z) * Math.min(1, dt * 12);
    d.arms[1].rotation.z += (-armR - d.arms[1].rotation.z) * Math.min(1, dt * 12);
    d.legs.forEach((l, i) => { l.rotation.x = jump > 0.05 ? (i ? 0.3 : -0.3) : 0; });
    // turn the head toward the camera (within the neck's comfort range)
    const local = c.worldToLocal(camPos.clone());
    const yaw = THREE.MathUtils.clamp(Math.atan2(local.x, local.z), -0.9, 0.9);
    d.head.rotation.y += (yaw - d.head.rotation.y) * Math.min(1, dt * 4);
    d.head.rotation.z = headTilt; d.head.rotation.x += (nod - d.head.rotation.x) * Math.min(1, dt * 6);
    d.mouth.scale.set(1, Math.abs(mouthS), 1); d.mouth.rotation.z = mouthS < 0 ? 0 : Math.PI; d.mouth.position.y = mouthS < 0 ? -0.13 : -0.1;
  });
}
