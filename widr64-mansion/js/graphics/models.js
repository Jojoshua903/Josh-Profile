// ==========================================================
// models.js — procedural low-poly 3D builders:
// all 9 WIDR 64 heroes (with accessories), Kayo & Yara,
// translucent ghosts, the Grumbleclaw boss, portrait frames.
// ==========================================================
import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { makeGlowTexture, makeHeartTexture } from './textures.js';
import { FX_UNIFORMS } from './postfx.js';
import { NOISE_GLSL } from './shaderlib.js';

const mat = (color, opts = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.05, flatShading: true, ...opts });

const glowMat = (color, intensity = 1.5) =>
  new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.4, flatShading: true });

function mesh(geo, material, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, shadow = true } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.scale.set(sx, sy, sz);
  m.castShadow = shadow;
  m.receiveShadow = false;
  return m;
}

function glowSprite(color, size, opacity = 0.8) {
  const hex = '#' + new THREE.Color(color).getHexString();
  const sm = new THREE.SpriteMaterial({
    map: makeGlowTexture(hex),
    color: 0xffffff,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const s = new THREE.Sprite(sm);
  s.scale.set(size, size, size);
  return s;
}

// ---------------------------------------------------------------
// HEROES
export function buildHero(char) {
  const c = char.colors;
  const isShadow = char.accessory === 'shadow';
  const root = new THREE.Group();
  root.name = 'hero_' + char.id;
  const body = new THREE.Group();
  root.add(body);

  const mPrim = mat(c.primary);
  const mSec = mat(c.secondary);
  const mSkin = isShadow ? mat(0x07070b, { roughness: 1 }) : mat(c.skin);
  const mHair = mat(c.hair);
  const mBoot = mat(isShadow ? 0x07070b : 0x2a1a10);
  const mMetal = mat(0x7d8a7a, { metalness: 0.55, roughness: 0.4 });
  const mDark = mat(0x22252a, { metalness: 0.3 });
  const mTank = mat(0x6c7a5a, { metalness: 0.35, roughness: 0.45 });
  const mBlack = isShadow ? mat(0x07070b, { roughness: 1 }) : null;

  const parts = { bulbs: [], extras: [] };

  // --- legs (pivot at hip)
  const legGeo = new THREE.CylinderGeometry(0.11, 0.1, 0.62, 6);
  const bootGeo = new THREE.BoxGeometry(0.2, 0.14, 0.32);
  const makeLeg = (side) => {
    const pivot = new THREE.Group();
    pivot.position.set(0.16 * side, 0.72, 0);
    pivot.add(mesh(legGeo, isShadow ? mBlack : mSec, { y: -0.31 }));
    pivot.add(mesh(bootGeo, mBoot, { y: -0.66, z: 0.05 }));
    body.add(pivot);
    return pivot;
  };
  parts.legL = makeLeg(-1);
  parts.legR = makeLeg(1);

  // --- torso
  if (isShadow) {
    const blob = mesh(new THREE.IcosahedronGeometry(0.46, 1), mBlack, { y: 1.08, sy: 1.15 });
    body.add(blob);
    parts.torso = blob;
    // wispy shadow skirt
    const wisp = mesh(new THREE.ConeGeometry(0.42, 0.6, 7, 1, true), mat(0x07070b, { transparent: true, opacity: 0.7, side: THREE.DoubleSide }), { y: 0.62, rx: Math.PI });
    body.add(wisp);
    parts.wisp = wisp;
  } else {
    const torso = mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.62, 7), mPrim, { y: 1.05 });
    body.add(torso);
    parts.torso = torso;
    // overall straps / belt
    body.add(mesh(new THREE.CylinderGeometry(0.355, 0.355, 0.1, 7), mDark, { y: 0.77 }));
    body.add(mesh(new THREE.BoxGeometry(0.12, 0.09, 0.05), mMetal, { y: 0.77, z: 0.35 }));
  }

  // --- head
  const head = new THREE.Group();
  head.position.set(0, 1.6, 0);
  body.add(head);
  parts.head = head;
  if (isShadow) {
    head.position.y = 1.52;
    head.add(mesh(new THREE.IcosahedronGeometry(0.3, 1), mBlack));
  } else {
    head.add(mesh(new THREE.IcosahedronGeometry(0.28, 1), mSkin));
    head.add(mesh(new THREE.SphereGeometry(0.075, 6, 4), mSkin, { y: -0.02, z: 0.27 }));
    // hair back
    head.add(mesh(new THREE.IcosahedronGeometry(0.27, 1), mHair, { y: 0.05, z: -0.06, sx: 1.02, sy: 0.9, sz: 0.95 }));
    head.add(mesh(new THREE.SphereGeometry(0.06, 5, 4), mSkin, { x: 0.27, y: 0 }));
    head.add(mesh(new THREE.SphereGeometry(0.06, 5, 4), mSkin, { x: -0.27, y: 0 }));
  }
  // eyes
  const eyeMat = isShadow ? glowMat(c.accent, 3) : mat(0x111118);
  const eyeGeo = isShadow ? new THREE.SphereGeometry(0.06, 6, 4) : new THREE.BoxGeometry(0.05, 0.08, 0.03);
  const eyeL = mesh(eyeGeo, eyeMat, { x: -0.1, y: 0.05, z: 0.26, shadow: false });
  const eyeR = mesh(eyeGeo, eyeMat, { x: 0.1, y: 0.05, z: 0.26, shadow: false });
  head.add(eyeL, eyeR);
  parts.eyes = [eyeL, eyeR];
  if (isShadow) {
    const gl = glowSprite(c.accent, 0.5, 0.6);
    gl.position.set(0, 0.05, 0.3);
    head.add(gl);
  } else {
    head.add(mesh(new THREE.BoxGeometry(0.12, 0.025, 0.02), mat(0x6a2a20), { y: -0.12, z: 0.26, shadow: false }));
  }

  // --- arms (pivot at shoulder). Both reach forward: right holds nozzle, left holds flashlight
  const armGeo = new THREE.CylinderGeometry(0.075, 0.07, 0.5, 6);
  const handGeo = new THREE.IcosahedronGeometry(0.085, 0);
  const makeArm = (side) => {
    const pivot = new THREE.Group();
    pivot.position.set(0.4 * side, 1.3, 0);
    pivot.add(mesh(armGeo, isShadow ? mBlack : mPrim, { y: -0.25 }));
    pivot.add(mesh(handGeo, isShadow ? mBlack : mat(0xf6f2ea), { y: -0.52 }));
    pivot.rotation.x = -1.15;
    pivot.rotation.z = -0.15 * side;
    body.add(pivot);
    return pivot;
  };
  parts.armL = makeArm(-1);
  parts.armR = makeArm(1);

  // flashlight in left hand
  const flash = new THREE.Group();
  flash.position.set(0, -0.55, 0.02);
  flash.rotation.x = Math.PI;
  flash.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.26, 6), mDark));
  const lens = mesh(new THREE.CylinderGeometry(0.085, 0.06, 0.08, 8), glowMat(c.light, 1.2), { y: 0.16, shadow: false });
  flash.add(lens);
  parts.armL.add(flash);
  parts.flashLens = lens;
  const flashTip = new THREE.Object3D();
  flashTip.position.set(0, 0.22, 0);
  flash.add(flashTip);
  parts.flashTip = flashTip;

  // --- Poltergust vacuum pack on back
  const pack = new THREE.Group();
  pack.position.set(0, 1.05, -0.38);
  body.add(pack);
  parts.pack = pack;
  if (char.accessory === 'gadget_pack') {
    pack.add(mesh(new THREE.BoxGeometry(0.75, 0.85, 0.42), mSec, { z: -0.08 }));
    pack.add(mesh(new THREE.BoxGeometry(0.6, 0.18, 0.08), mDark, { y: 0.2, z: -0.31 }));
    for (let i = 0; i < 3; i++) {
      const b = mesh(new THREE.SphereGeometry(0.045, 6, 4), glowMat(i === 1 ? 0xff5050 : c.accent, 2), { x: -0.18 + i * 0.18, y: 0.2, z: -0.36, shadow: false });
      pack.add(b);
      parts.bulbs.push(b);
    }
    pack.add(mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.7, 4), mDark, { x: 0.28, y: 0.72 }));
    const antBulb = mesh(new THREE.SphereGeometry(0.06, 6, 4), glowMat(0xff5050, 2.5), { x: 0.28, y: 1.08, shadow: false });
    pack.add(antBulb);
    parts.bulbs.push(antBulb);
    pack.add(mesh(new THREE.TorusGeometry(0.16, 0.035, 5, 10), mMetal, { x: -0.22, y: 0.5, ry: Math.PI / 2 }));
  } else {
    pack.add(mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.78, 8), isShadow ? mat(0x30343a) : mTank));
    pack.add(mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.06, 8), mMetal, { y: 0.34 }));
    pack.add(mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.06, 8), mMetal, { y: -0.34 }));
    pack.add(mesh(new THREE.SphereGeometry(0.06, 6, 4), glowMat(0x4dff7a, 1.6), { x: 0.0, y: 0.15, z: -0.24, shadow: false }));
  }

  // nozzle in right hand
  const nozzle = new THREE.Group();
  nozzle.position.set(0, -0.56, 0.05);
  nozzle.rotation.x = Math.PI;
  nozzle.add(mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.3, 7), mDark));
  nozzle.add(mesh(new THREE.CylinderGeometry(0.13, 0.08, 0.16, 8, 1, true), mat(0x3a3f45, { side: THREE.DoubleSide, metalness: 0.4 }), { y: 0.22 }));
  parts.armR.add(nozzle);
  const nozzleTip = new THREE.Object3D();
  nozzleTip.position.set(0, 0.32, 0);
  nozzle.add(nozzleTip);
  parts.nozzleTip = nozzleTip;

  // hose (static curve from pack to right shoulder area)
  const hoseCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.18, 0.78, -0.42),
    new THREE.Vector3(0.48, 0.7, -0.15),
    new THREE.Vector3(0.52, 0.92, 0.22),
    new THREE.Vector3(0.44, 1.12, 0.42),
  ]);
  const hose = mesh(new THREE.TubeGeometry(hoseCurve, 12, 0.045, 5, false), mat(0x3b4d3a));
  body.add(hose);

  // --- accessories
  switch (char.accessory) {
    case 'cap_bat': {
      const cap = mesh(new THREE.SphereGeometry(0.3, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), mPrim, { y: 0.06 });
      head.add(cap);
      head.add(mesh(new THREE.BoxGeometry(0.34, 0.03, 0.26), mPrim, { y: 0.07, z: 0.32 }));
      head.add(mesh(new THREE.BoxGeometry(0.1, 0.1, 0.02), mat(0xffffff), { y: 0.2, z: 0.25, rx: -0.6 }));
      const bat = new THREE.Group();
      bat.position.set(0.05, 0.1, -0.24);
      bat.rotation.z = 0.7;
      bat.add(mesh(new THREE.CylinderGeometry(0.075, 0.035, 1.05, 7), mat(0xc99256)));
      bat.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 6), mat(0x8a5a2a), { y: -0.52 }));
      pack.add(bat);
      break;
    }
    case 'visor_eye': {
      head.add(mesh(new THREE.BoxGeometry(0.5, 0.11, 0.1), mat(0x1b1f2a, { metalness: 0.5 }), { y: 0.05, z: 0.22 }));
      const robo = mesh(new THREE.SphereGeometry(0.07, 8, 6), glowMat(0x5ff6ff, 3), { x: 0.1, y: 0.05, z: 0.29, shadow: false });
      head.add(robo);
      parts.bulbs.push(robo);
      const g = glowSprite(0x5ff6ff, 0.55, 0.85);
      g.position.set(0.1, 0.05, 0.33);
      head.add(g);
      parts.roboGlow = g;
      head.add(mesh(new THREE.BoxGeometry(0.04, 0.16, 0.12), mat(0x2d5aa0, { metalness: 0.4 }), { x: 0.27, y: 0.05, z: 0.1 }));
      head.add(mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.22, 4), mDark, { x: 0.29, y: 0.2, z: 0.05 }));
      break;
    }
    case 'wizard_hat': {
      head.add(mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 9), mPrim, { y: 0.17 }));
      const cone = mesh(new THREE.ConeGeometry(0.27, 0.75, 8), mPrim, { y: 0.55, rz: -0.18, x: -0.05 });
      head.add(cone);
      head.add(mesh(new THREE.CylinderGeometry(0.275, 0.29, 0.07, 8), mSec, { y: 0.21 }));
      head.add(mesh(new THREE.ConeGeometry(0.16, 0.36, 6), mHair, { y: -0.3, z: 0.14, rx: Math.PI }));
      // crackling sparks
      const sparkGeo = new THREE.BufferGeometry();
      const n = 28;
      const pos = new Float32Array(n * 3);
      sparkGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ color: 0xfff36b, size: 0.07, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
      sparks.position.y = 0.5;
      head.add(sparks);
      parts.sparks = sparks;
      const sg = glowSprite(0xfff36b, 0.7, 0.5);
      sg.position.set(-0.12, 0.95, 0);
      head.add(sg);
      parts.extras.push(sg);
      break;
    }
    case 'shadow':
      break;
    case 'headlamp_beard': {
      root.scale.set(1.18, 0.92, 1.18);
      head.add(mesh(new THREE.SphereGeometry(0.31, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), mSec, { y: 0.04 }));
      head.add(mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.05, 9), mat(0xb88a1a), { y: 0.05 }));
      head.add(mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.08, 7), mDark, { y: 0.2, z: 0.26, rx: Math.PI / 2 }));
      const lamp = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 8), glowMat(0xfff2b0, 3), { y: 0.2, z: 0.31, rx: Math.PI / 2, shadow: false });
      head.add(lamp);
      const lg = glowSprite(0xfff2b0, 0.6, 0.85);
      lg.position.set(0, 0.2, 0.34);
      head.add(lg);
      parts.headlampAnchor = lamp;
      // big beard
      head.add(mesh(new THREE.ConeGeometry(0.27, 0.62, 7), mHair, { y: -0.32, z: 0.14, rx: Math.PI + 0.25 }));
      head.add(mesh(new THREE.BoxGeometry(0.28, 0.06, 0.06), mHair, { y: -0.08, z: 0.27 }));
      // pickaxe on pack
      const axe = new THREE.Group();
      axe.position.set(-0.05, 0.2, -0.26);
      axe.rotation.z = -0.6;
      axe.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 5), mat(0x8a5a2a)));
      axe.add(mesh(new THREE.BoxGeometry(0.5, 0.07, 0.07), mMetal, { y: 0.42 }));
      pack.add(axe);
      break;
    }
    case 'goggles_bomb': {
      const gogMat = mat(0xff7a1a, { metalness: 0.4 });
      head.add(mesh(new THREE.TorusGeometry(0.075, 0.025, 5, 10), gogMat, { x: -0.1, y: 0.07, z: 0.26 }));
      head.add(mesh(new THREE.TorusGeometry(0.075, 0.025, 5, 10), gogMat, { x: 0.1, y: 0.07, z: 0.26 }));
      head.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 8), mat(0xffe0a8, { emissive: 0x553300 }), { x: -0.1, y: 0.07, z: 0.27, rx: Math.PI / 2, shadow: false }));
      head.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 8), mat(0xffe0a8, { emissive: 0x553300 }), { x: 0.1, y: 0.07, z: 0.27, rx: Math.PI / 2, shadow: false }));
      head.add(mesh(new THREE.TorusGeometry(0.285, 0.025, 4, 14), mat(0x3a2a1a), { y: 0.07, rx: Math.PI / 2 }));
      // bombs on pack
      const bombMat = mat(0x1a1a1a, { metalness: 0.4, roughness: 0.3 });
      for (const side of [-1, 1]) {
        pack.add(mesh(new THREE.IcosahedronGeometry(0.15, 1), bombMat, { x: 0.25 * side, y: -0.2, z: -0.12 }));
      }
      const bigBomb = mesh(new THREE.IcosahedronGeometry(0.2, 1), bombMat, { y: 0.5, z: -0.05 });
      pack.add(bigBomb);
      pack.add(mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.16, 4), mat(0xa08060), { y: 0.75, z: -0.05, rz: 0.4 }));
      const fuse = glowSprite(0xffb040, 0.35, 1);
      fuse.position.set(-0.04, 0.84, -0.05);
      pack.add(fuse);
      parts.fuse = fuse;
      break;
    }
    case 'ice_crown': {
      const iceMat = new THREE.MeshStandardMaterial({ color: 0xbfefff, emissive: 0x5fc8ff, emissiveIntensity: 0.9, transparent: true, opacity: 0.88, roughness: 0.1, metalness: 0.2, flatShading: true });
      head.add(mesh(new THREE.TorusGeometry(0.26, 0.04, 5, 12), iceMat, { y: 0.17, rx: Math.PI / 2 }));
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const h = i === 0 ? 0.32 : 0.16 + (i % 2) * 0.08;
        head.add(mesh(new THREE.ConeGeometry(0.05, h, 4), iceMat, { x: Math.sin(a) * 0.25, y: 0.2 + h / 2, z: Math.cos(a) * 0.25 }));
      }
      const ig = glowSprite(0x9feaff, 0.9, 0.35);
      ig.position.y = 0.3;
      head.add(ig);
      // cape
      const capeGeo = new THREE.PlaneGeometry(0.9, 1.1, 4, 6);
      capeGeo.translate(0, -0.55, 0);
      const cape = new THREE.Mesh(capeGeo, mat(c.primary, { side: THREE.DoubleSide }));
      cape.position.set(0, 1.42, -0.32);
      cape.rotation.x = 0.12;
      cape.castShadow = true;
      body.add(cape);
      parts.cape = cape;
      parts.capeBase = capeGeo.attributes.position.array.slice();
      body.add(mesh(new THREE.TorusGeometry(0.33, 0.06, 5, 10), mat(0xeaf6ff), { y: 1.36, rx: Math.PI / 2 }));
      break;
    }
    case 'shamrock_crystals': {
      const hatMat = mat(c.secondary);
      head.add(mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.04, 10), hatMat, { y: 0.15 }));
      head.add(mesh(new THREE.CylinderGeometry(0.25, 0.29, 0.22, 9), hatMat, { y: 0.27 }));
      head.add(mesh(new THREE.CylinderGeometry(0.295, 0.295, 0.06, 9), mPrim, { y: 0.19 }));
      // shamrock on chest
      const shamMat = mat(0x3ad35a, { emissive: 0x0a4a14 });
      [[0, 0.06], [-0.055, 0], [0.055, 0]].forEach(([dx, dy]) => body.add(mesh(new THREE.SphereGeometry(0.045, 6, 4), shamMat, { x: -0.13 + dx, y: 1.2 + dy, z: 0.3, shadow: false })));
      // crystals on pack
      const cols = [0x7dffb0, 0xb07dff, 0x5fd8ff];
      for (let i = 0; i < 5; i++) {
        const cr = mesh(new THREE.OctahedronGeometry(0.09 + (i % 2) * 0.05, 0), glowMat(cols[i % 3], 1.4), {
          x: -0.18 + i * 0.09, y: 0.4 + (i % 2) * 0.1, z: -0.1, sy: 1.8, rz: (i - 2) * 0.25, shadow: false,
        });
        pack.add(cr);
        parts.bulbs.push(cr);
      }
      const cg = glowSprite(0x7dffb0, 0.9, 0.4);
      cg.position.set(0, 0.45, -0.1);
      pack.add(cg);
      // magnifier on belt
      body.add(mesh(new THREE.TorusGeometry(0.07, 0.015, 4, 10), mMetal, { x: 0.3, y: 0.75, z: 0.2, ry: 0.6 }));
      break;
    }
    case 'gadget_pack': {
      root.scale.set(0.95, 0.95, 0.95);
      head.add(mesh(new THREE.SphereGeometry(0.29, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), mHair, { y: 0.03 }));
      head.add(mesh(new THREE.ConeGeometry(0.06, 0.16, 4), mHair, { x: 0.08, y: 0.32, rz: -0.4 }));
      head.add(mesh(new THREE.BoxGeometry(0.42, 0.07, 0.06), mat(0x3a3fd0), { y: 0.13, z: 0.24 }));
      break;
    }
    case 'professor': {
      // Professor Koç: no vacuum gear, a long lab coat, round glasses and
      // wild ice-white hair (a little frost left over from the Duke of Ice days)
      pack.visible = false;
      hose.visible = false;
      nozzle.visible = false;
      flash.visible = false;
      const coat = mat(0xf2f5fa, { roughness: 0.85 });
      body.add(mesh(new THREE.CylinderGeometry(0.36, 0.48, 0.62, 8, 1, true), coat, { y: 0.5 }));
      body.add(mesh(new THREE.BoxGeometry(0.05, 0.5, 0.02), mSec, { y: 1.1, z: 0.33 })); // tie
      body.add(mesh(new THREE.BoxGeometry(0.1, 0.1, 0.02), mat(0x9feaff, { emissive: 0x2a88c0 }), { x: -0.17, y: 1.2, z: 0.31, shadow: false })); // ice pin
      for (const side of [-1, 1]) {
        head.add(mesh(new THREE.TorusGeometry(0.075, 0.016, 5, 12), mat(0x30333a, { metalness: 0.6 }), { x: 0.1 * side, y: 0.05, z: 0.27 }));
        head.add(mesh(new THREE.ConeGeometry(0.1, 0.28, 5), mHair, { x: 0.25 * side, y: 0.16, z: -0.02, rz: -1.1 * side }));
      }
      head.add(mesh(new THREE.BoxGeometry(0.08, 0.016, 0.016), mat(0x30333a), { y: 0.05, z: 0.28 }));
      head.add(mesh(new THREE.ConeGeometry(0.09, 0.22, 5), mHair, { y: 0.32, z: -0.05, rx: -0.4 }));
      head.add(mesh(new THREE.BoxGeometry(0.16, 0.035, 0.03), mHair, { y: -0.1, z: 0.27, shadow: false })); // moustache
      // arms hang lower; a clipboard in the left hand
      parts.armL.rotation.x = -0.55;
      parts.armR.rotation.x = -0.25;
      const board = new THREE.Group();
      board.position.set(0, -0.56, 0.08);
      board.add(mesh(new THREE.BoxGeometry(0.24, 0.32, 0.02), mat(0x8a5a2a)));
      board.add(mesh(new THREE.BoxGeometry(0.2, 0.26, 0.01), mat(0xf6f2ea), { z: 0.015 }));
      parts.armL.add(board);
      parts.professor = true;
      break;
    }
    default:
      break;
  }

  body.traverse((o) => {
    if (o.isMesh) o.castShadow = o.castShadow !== false;
  });

  const s = char.stats.scale || 1;
  root.scale.multiplyScalar(s);

  let walkPhase = 0;
  const animate = (t, speed01, dt) => {
    walkPhase += dt * (6 + speed01 * 9) * (speed01 > 0.05 ? 1 : 0);
    const swing = Math.sin(walkPhase) * 0.75 * Math.min(1, speed01 * 1.4);
    parts.legL.rotation.x = swing;
    parts.legR.rotation.x = -swing;
    body.position.y = Math.abs(Math.sin(walkPhase)) * 0.06 * speed01 + Math.sin(t * 2) * 0.01;
    body.rotation.z = Math.sin(walkPhase) * 0.03 * speed01;
    head.rotation.y = Math.sin(t * 0.9) * 0.08;
    // idle "humming" bob: little head tilts and a soft bounce in rhythm
    const idle = 1 - Math.min(1, speed01 * 4);
    head.rotation.z = Math.sin(t * 3.2) * 0.09 * idle;
    head.position.y = (isShadow ? 1.52 : 1.6) + Math.abs(Math.sin(t * 3.2)) * 0.025 * idle;
    body.position.y += Math.abs(Math.sin(t * 1.6)) * 0.02 * idle;
    if (parts.armL && idle > 0.5 && !parts.professor) parts.armL.rotation.z = 0.15 + Math.sin(t * 1.6) * 0.06 * idle;
    if (parts.wisp) parts.wisp.scale.set(1 + Math.sin(t * 6) * 0.06, 1 + Math.sin(t * 4.5) * 0.1, 1);
    if (parts.sparks) {
      const p = parts.sparks.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const a = t * 3 + i * 1.7;
        const r = 0.2 + ((i * 37) % 10) * 0.035 + Math.sin(t * 13 + i) * 0.05;
        p.setXYZ(i, Math.cos(a) * r - 0.1, ((i * 13) % 10) * 0.07 + Math.sin(t * 20 + i) * 0.05, Math.sin(a) * r);
      }
      p.needsUpdate = true;
      parts.sparks.material.opacity = 0.6 + Math.random() * 0.4;
    }
    if (parts.cape) {
      const arr = parts.cape.geometry.attributes.position.array;
      const base = parts.capeBase;
      for (let i = 0; i < arr.length; i += 3) {
        const yy = base[i + 1];
        const k = -yy;
        arr[i + 2] = base[i + 2] - k * k * (0.25 + speed01 * 0.5) + Math.sin(t * 5 + base[i] * 3 + yy * 4) * 0.04 * k;
      }
      parts.cape.geometry.attributes.position.needsUpdate = true;
      parts.cape.geometry.computeVertexNormals();
    }
    if (parts.fuse) {
      const f = 0.25 + Math.random() * 0.2;
      parts.fuse.scale.set(f, f, f);
    }
    if (parts.roboGlow) parts.roboGlow.material.opacity = 0.65 + Math.sin(t * 8) * 0.2;
    parts.bulbs.forEach((b, i) => {
      if (b.material.emissiveIntensity !== undefined) b.material.emissiveIntensity = 1.2 + Math.max(0, Math.sin(t * 5 + i * 1.3)) * 1.8;
    });
  };

  return { group: root, body, parts, animate };
}

// ---------------------------------------------------------------
// Kayo & Yara (Lars's cats)
export function buildCat(fur = 0x222222, eye = 0xf7d14a, belly = null) {
  const g = new THREE.Group();
  const m = mat(fur);
  g.add(mesh(new THREE.BoxGeometry(0.22, 0.2, 0.42), m, { y: 0.2 }));
  if (belly) g.add(mesh(new THREE.BoxGeometry(0.16, 0.06, 0.3), mat(belly), { y: 0.1, z: 0.02 }));
  const head = new THREE.Group();
  head.position.set(0, 0.36, 0.22);
  head.add(mesh(new THREE.BoxGeometry(0.22, 0.2, 0.2), m));
  head.add(mesh(new THREE.ConeGeometry(0.05, 0.1, 4), m, { x: -0.07, y: 0.14 }));
  head.add(mesh(new THREE.ConeGeometry(0.05, 0.1, 4), m, { x: 0.07, y: 0.14 }));
  const em = glowMat(eye, 1.8);
  head.add(mesh(new THREE.BoxGeometry(0.04, 0.04, 0.02), em, { x: -0.05, y: 0.02, z: 0.1, shadow: false }));
  head.add(mesh(new THREE.BoxGeometry(0.04, 0.04, 0.02), em, { x: 0.05, y: 0.02, z: 0.1, shadow: false }));
  g.add(head);
  const tail = new THREE.Group();
  tail.position.set(0, 0.26, -0.2);
  tail.add(mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.32, 4), m, { y: 0.15, rx: -0.4 }));
  g.add(tail);
  const legs = [];
  for (const [x, z] of [[-0.07, 0.14], [0.07, 0.14], [-0.07, -0.14], [0.07, -0.14]]) {
    const l = mesh(new THREE.BoxGeometry(0.05, 0.12, 0.05), m, { x, y: 0.06, z });
    g.add(l);
    legs.push(l);
  }
  let ph = Math.random() * 6;
  const animate = (t, speed01, dt) => {
    ph += dt * (4 + speed01 * 14);
    tail.rotation.z = Math.sin(t * 3 + ph * 0.1) * 0.5;
    legs.forEach((l, i) => (l.rotation.x = Math.sin(ph + (i % 2) * Math.PI) * 0.6 * speed01));
    head.rotation.y = Math.sin(t * 0.7 + ph * 0.05) * 0.3;
  };
  return { group: g, animate };
}

// ---------------------------------------------------------------
// GHOSTS
const GHOST_KINDS = {
  gold: { color: 0xffb347, eye: 0xff2a2a, scale: 1.0, name: 'Gold Ghost' },
  blue: { color: 0x6aa8ff, eye: 0xfff36b, scale: 1.05, name: 'Blue Twirler' },
  pink: { color: 0xff7ad9, eye: 0x7affef, scale: 0.92, name: 'Pink Speedster' },
  green: { color: 0x7dff9a, eye: 0xff4f7a, scale: 1.0, name: 'Grabbing Ghost' },
  purple: { color: 0xb06aff, eye: 0xfff36b, scale: 1.08, name: 'Purple Puncher' },
  white: { color: 0xe8f0ff, eye: 0x4a8aff, scale: 0.9, name: 'Shy Wisp' },
  red: { color: 0xff5a3a, eye: 0xffe060, scale: 0.95, name: 'Ember Imp' },
  tosser: { color: 0x4ad8b8, eye: 0xff3a6a, scale: 1.0, name: 'Tossing Ghost' },
  speedy: { color: 0x7ac8ff, eye: 0xffffff, scale: 0.78, name: 'Speedy Spirit' },
  fire: { color: 0xff6a1a, eye: 0xfff0a0, scale: 1.0, name: 'Blazing Ghost', crown: 'flame' },
  water: { color: 0x3a8aff, eye: 0xe8ffff, scale: 1.0, name: 'Drip Ghost', crown: 'drop' },
  ice: { color: 0xc8f4ff, eye: 0x2a6aff, scale: 1.0, name: 'Frost Ghost', crown: 'icicle' },
  sonata: { color: 0xd9a6ff, eye: 0x3a1060, scale: 1.5, name: 'Madame Sonata' },
  snoozewell: { color: 0x9fc4ff, eye: 0x10204a, scale: 1.6, name: 'Lord Snoozewell' },
  boilerbeard: { color: 0xff9a5a, eye: 0xfff0a0, scale: 1.65, name: 'Boilerbeard' },
  varnish: { color: 0xfff0a0, eye: 0x7a1a28, scale: 1.7, name: 'Master Varnish' },
  patchnotes: { color: 0x9affc8, eye: 0x0a3a1a, scale: 1.45, name: 'Professor Patchnotes' },
  pip: { color: 0xffb8e8, eye: 0x2a1040, scale: 1.25, name: 'Pixel Pip' },
};

// Ghost skin shader: swirling ectoplasm inside the body, a glowing
// fresnel rim with a soft pearly shimmer, and a tail that frays into wisps
function addGhostRim(material, color) {
  material.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = FX_UNIFORMS.uTime;
    sh.uniforms.uRim = { value: new THREE.Color(color).multiplyScalar(1.6) };
    sh.vertexShader = 'varying vec3 vGhostObj;\n' + sh.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\n      vGhostObj = position;',
    );
    sh.fragmentShader = 'uniform float uTime;\nuniform vec3 uRim;\nvarying vec3 vGhostObj;\n' + NOISE_GLSL + sh.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
      float ghostRim = pow(1.0 - clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0), 2.2);
      float ghostWave = 0.7 + 0.3 * sin(uTime * 3.2 - vViewPosition.y * 5.0);
      // ectoplasm swirling up through the body
      vec3 gq = vGhostObj * 2.6;
      float gsw = sin(uTime * 0.7);
      gq.xz = mat2(cos(gq.y + gsw), -sin(gq.y + gsw), sin(gq.y + gsw), cos(gq.y + gsw)) * gq.xz;
      float ecto = fbm3(gq + vec3(0.0, -uTime * 0.8, uTime * 0.2));
      float veins = smoothstep(0.55, 0.8, ecto) * (1.0 - smoothstep(0.8, 0.95, ecto) * 0.5);
      // pearly shimmer on the rim
      vec3 pearl = 0.5 + 0.5 * cos(6.2831853 * (ghostRim * 0.9 + uTime * 0.08 + vec3(0.0, 0.33, 0.67)));
      vec3 rimCol = mix(uRim, pearl * max(max(uRim.r, uRim.g), uRim.b), 0.3);
      totalEmissiveRadiance += rimCol * ghostRim * ghostWave + uRim * veins * 0.45;
      // the tail frays and fades into wisps
      float gTail = smoothstep(-0.8, -0.15, vGhostObj.y + (ecto - 0.5) * 0.45);
      diffuseColor.a = min(1.0, diffuseColor.a * (1.0 + ghostRim * 0.8)) * gTail;`,
    );
  };
  material.customProgramCacheKey = () => 'ghostRim2';
}

function ghostProfile(scale = 1) {
  const pts = [
    [0.0, 1.0], [0.28, 0.97], [0.46, 0.86], [0.57, 0.66], [0.6, 0.42], [0.56, 0.16],
    [0.47, -0.1], [0.36, -0.34], [0.24, -0.55], [0.12, -0.72], [0.02, -0.82],
  ];
  return pts.map(([r, y]) => new THREE.Vector2(r * scale, y * scale));
}

export function buildGhost(kind = 'gold') {
  const k = GHOST_KINDS[kind] || GHOST_KINDS.gold;
  const g = new THREE.Group();
  const inner = new THREE.Group();
  g.add(inner);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: k.color, emissive: k.color, emissiveIntensity: 0.55, transparent: true, opacity: 0.72,
    roughness: 0.3, flatShading: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const body = new THREE.Mesh(new THREE.LatheGeometry(ghostProfile(1), 10), bodyMat);
  addGhostRim(bodyMat, k.color);
  body.castShadow = false;
  inner.add(body);
  const eyeMat = glowMat(k.eye, 3);
  const eyeL = mesh(new THREE.SphereGeometry(0.1, 6, 4), eyeMat, { x: -0.19, y: 0.5, z: 0.5, sy: 1.3, shadow: false });
  const eyeR = mesh(new THREE.SphereGeometry(0.1, 6, 4), eyeMat, { x: 0.19, y: 0.5, z: 0.5, sy: 1.3, shadow: false });
  inner.add(eyeL, eyeR);
  const mouth = mesh(new THREE.SphereGeometry(0.16, 8, 4), new THREE.MeshBasicMaterial({ color: 0x220011 }), { y: 0.2, z: 0.5, sx: 1.4, sy: 0.6, sz: 0.4, shadow: false });
  inner.add(mouth);
  const tongue = mesh(new THREE.SphereGeometry(0.08, 6, 4), new THREE.MeshBasicMaterial({ color: 0xff4f7a }), { y: 0.13, z: 0.55, sx: 1.2, sy: 0.6, sz: 0.5, shadow: false });
  inner.add(tongue);
  const armMat = bodyMat.clone();
  const armL = mesh(new THREE.IcosahedronGeometry(0.17, 0), armMat, { x: -0.62, y: 0.3, z: 0.1, shadow: false });
  const armR = mesh(new THREE.IcosahedronGeometry(0.17, 0), armMat, { x: 0.62, y: 0.3, z: 0.1, shadow: false });
  inner.add(armL, armR);
  const glow = glowSprite(k.color, 3.0, 0.4);
  glow.position.y = 0.2;
  g.add(glow);
  const eyeGlow = glowSprite(k.eye, 1.0, 0.7);
  eyeGlow.position.set(0, 0.5, 0.55);
  inner.add(eyeGlow);

  const heartMat = new THREE.SpriteMaterial({ map: makeHeartTexture(100), transparent: true, depthTest: false });
  const heart = new THREE.Sprite(heartMat);
  heart.scale.set(0.7, 0.7, 0.7);
  heart.position.set(0, 1.55, 0);
  heart.visible = false;
  heart.renderOrder = 10;
  g.add(heart);
  let lastHp = 100;
  const setHeart = (hp) => {
    const v = Math.ceil(hp);
    if (v === lastHp) return;
    lastHp = v;
    heartMat.map.dispose();
    heartMat.map = makeHeartTexture(v);
    heartMat.needsUpdate = true;
  };

  // beating 3D heart shown through the translucent body when stunned
  const heart3d = buildHeart3D(0.22);
  heart3d.position.set(0, 0.42, 0.18);
  heart3d.visible = false;
  inner.add(heart3d);
  const animateGhost = makeGhostAnimator(body, heart3d, 0.15, 0.14);

  // element ghosts wear their element: a flickering flame, a fat water
  // drop, or a ring of icicles on top of the head
  if (k.crown === 'flame') {
    inner.add(mesh(new THREE.ConeGeometry(0.22, 0.6, 7), glowMat(0xffb020, 1.6), { y: 1.18, shadow: false }));
    inner.add(mesh(new THREE.ConeGeometry(0.12, 0.38, 6), glowMat(0xfff0a0, 2), { y: 1.12, z: 0.06, shadow: false }));
  } else if (k.crown === 'drop') {
    const drop = new THREE.Group();
    drop.add(mesh(new THREE.SphereGeometry(0.2, 10, 8), bodyMat, { shadow: false }));
    drop.add(mesh(new THREE.ConeGeometry(0.19, 0.34, 10), bodyMat, { y: 0.22, shadow: false }));
    drop.position.y = 1.2;
    inner.add(drop);
  } else if (k.crown === 'icicle') {
    const iceMat = glowMat(0xe8ffff, 0.8);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      inner.add(mesh(new THREE.ConeGeometry(0.06, 0.34 + (i % 2) * 0.16, 5), iceMat, { x: Math.sin(a) * 0.26, y: 1.08 + (i % 2) * 0.08, z: Math.cos(a) * 0.26, shadow: false }));
    }
  }
  g.scale.setScalar(k.scale);
  return {
    group: g, inner, body, bodyMat, armMat, eyes: [eyeL, eyeR], mouth, tongue, arms: [armL, armR], glow, eyeGlow, heart, setHeart,
    color: k.color, name: k.name, heart3d, animate: animateGhost,
  };
}

// ---------------------------------------------------------------
// PORTRAIT GHOSTS — the area bosses of the big mansion. A standard ghost
// body with a signature accessory and a held prop.
export function buildPortraitGhost(kind) {
  const m = buildGhost(kind);
  const inner = m.inner;
  const acc = new THREE.Group();
  inner.add(acc);
  let prop = null;
  if (kind === 'sonata') {
    const hair = mat(0x5a2a7a);
    acc.add(mesh(new THREE.SphereGeometry(0.3, 8, 6), hair, { y: 1.05, sy: 0.9 }));
    acc.add(mesh(new THREE.SphereGeometry(0.2, 8, 6), hair, { y: 1.35 }));
    acc.add(mesh(new THREE.OctahedronGeometry(0.08, 0), glowMat(0xffd23a, 1.2), { y: 1.55 }));
    for (let i = 0; i < 9; i++) {
      const a = -0.9 + (i / 8) * 1.8;
      acc.add(mesh(new THREE.SphereGeometry(0.045, 6, 4), mat(0xf6f2ff, { roughness: 0.15 }), { x: Math.sin(a) * 0.48, y: 0.02 - Math.cos(a) * 0.08, z: Math.cos(a) * 0.4, shadow: false }));
    }
    // conductor's baton
    prop = mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.6, 5), mat(0xf6f2ea), { rz: 0.6 });
    prop.position.set(0, 0.1, 0);
  } else if (kind === 'snoozewell') {
    const cap = mesh(new THREE.ConeGeometry(0.42, 1.0, 8), mat(0xd8312e), { y: 1.2, rz: -0.6, x: 0.25 });
    acc.add(cap);
    acc.add(mesh(new THREE.TorusGeometry(0.42, 0.07, 5, 14), mat(0xf6f2ea), { y: 0.92, rx: Math.PI / 2 }));
    acc.add(mesh(new THREE.SphereGeometry(0.12, 6, 4), mat(0xf6f2ea), { x: 0.78, y: 1.42 }));
    // teddy bear tucked under an arm
    prop = new THREE.Group();
    prop.add(mesh(new THREE.SphereGeometry(0.16, 6, 5), mat(0xa0682a)));
    prop.add(mesh(new THREE.SphereGeometry(0.11, 6, 5), mat(0xa0682a), { y: 0.2 }));
    prop.add(mesh(new THREE.SphereGeometry(0.04, 4, 3), mat(0xa0682a), { x: -0.08, y: 0.3 }));
    prop.add(mesh(new THREE.SphereGeometry(0.04, 4, 3), mat(0xa0682a), { x: 0.08, y: 0.3 }));
  } else if (kind === 'boilerbeard') {
    const soot = mat(0x2a1c14);
    acc.add(mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.32, 10), mat(0x1c1410), { y: 1.12 }));
    acc.add(mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.05, 12), mat(0x1c1410), { y: 0.96 }));
    acc.add(mesh(new THREE.SphereGeometry(0.42, 8, 6), soot, { y: -0.05, z: 0.32, sy: 0.85, sx: 1.1 }));
    acc.add(mesh(new THREE.SphereGeometry(0.06, 5, 4), glowMat(0xff6a2a, 2.5), { x: 0.3, y: 0.22, z: 0.66, shadow: false }));
    // coal shovel
    prop = new THREE.Group();
    prop.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 5), mat(0x5a3a20), { rz: 0.2 }));
    prop.add(mesh(new THREE.BoxGeometry(0.28, 0.04, 0.32), mat(0x3a3a40, { metalness: 0.6 }), { y: -0.5, x: -0.1 }));
  } else if (kind === 'varnish') {
    acc.add(mesh(new THREE.CylinderGeometry(0.46, 0.38, 0.12, 12), mat(0x7a1a28), { y: 1.0, rz: -0.18 }));
    acc.add(mesh(new THREE.SphereGeometry(0.05, 4, 3), mat(0x7a1a28), { y: 1.1 }));
    const tache = mat(0x2a2008);
    acc.add(mesh(new THREE.TorusGeometry(0.1, 0.03, 4, 8, Math.PI * 1.4), tache, { x: -0.13, y: 0.32, z: 0.56, rz: 0.4 }));
    acc.add(mesh(new THREE.TorusGeometry(0.1, 0.03, 4, 8, Math.PI * 1.4), tache, { x: 0.13, y: 0.32, z: 0.56, rz: Math.PI - 0.4 + 0.8 }));
    // paintbrush with a glowing tip
    prop = new THREE.Group();
    prop.add(mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.7, 5), mat(0x5a3a20)));
    prop.add(mesh(new THREE.ConeGeometry(0.05, 0.14, 5), glowMat(0x3a7aff, 1.6), { y: 0.42 }));
  } else if (kind === 'patchnotes') {
    // square specs, a headset, and a laptop glowing with WIDR 64 code
    const frame = mat(0x1a1a22);
    for (const x of [-0.19, 0.19]) acc.add(mesh(new THREE.TorusGeometry(0.12, 0.022, 4, 4), frame, { x, y: 0.5, z: 0.58, rz: Math.PI / 4, shadow: false }));
    acc.add(mesh(new THREE.BoxGeometry(0.14, 0.025, 0.025), frame, { y: 0.52, z: 0.6, shadow: false }));
    acc.add(mesh(new THREE.TorusGeometry(0.5, 0.035, 5, 14, Math.PI), mat(0x2a2a34), { y: 0.62, rz: 0 }));
    for (const x of [-0.5, 0.5]) acc.add(mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 10), mat(0x2a2a34), { x, y: 0.55, rz: Math.PI / 2 }));
    acc.add(mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.4, 4), mat(0x2a2a34), { x: -0.38, y: 0.38, z: 0.25, rx: 1.1, rz: 0.4 }));
    const screenMat = new THREE.MeshStandardMaterial({ color: 0x0a1a10, emissive: 0x3aff7a, emissiveIntensity: 1.4, roughness: 0.4 });
    const laptop = new THREE.Group();
    laptop.add(mesh(new THREE.BoxGeometry(0.72, 0.04, 0.46), mat(0x3a3a46, { metalness: 0.4 })));
    laptop.add(mesh(new THREE.BoxGeometry(0.72, 0.46, 0.03), mat(0x3a3a46, { metalness: 0.4 }), { y: 0.23, z: -0.22, rx: -0.25 }));
    laptop.add(mesh(new THREE.PlaneGeometry(0.64, 0.38), screenMat, { y: 0.23, z: -0.2, rx: -0.25, shadow: false }));
    laptop.position.set(0, -0.05, 0.85);
    // screen turned out toward you, so you can read his build status
    acc.add(laptop);
    m.screenMat = screenMat;
    // crunch-time coffee mug
    prop = new THREE.Group();
    prop.add(mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.18, 8), mat(0xf6f2ea)));
    prop.add(mesh(new THREE.TorusGeometry(0.05, 0.015, 4, 8), mat(0xf6f2ea), { x: 0.1 }));
    prop.add(mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.01, 8), mat(0x3a1a08), { y: 0.085 }));
  } else if (kind === 'pip') {
    // propeller beanie and a WIDR Boy handheld
    const cap = new THREE.Group();
    const stripes = [0xd8312e, 0xffd21a, 0x1f9fe0, 0x6fd36a];
    for (let i = 0; i < 4; i++) {
      cap.add(mesh(new THREE.SphereGeometry(0.4, 10, 5, (i / 4) * Math.PI * 2, Math.PI / 2, 0, Math.PI / 2), mat(stripes[i]), { shadow: false }));
    }
    cap.position.y = 0.78;
    acc.add(cap);
    acc.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 5), mat(0x2a2a34), { y: 1.24 }));
    const spinner = new THREE.Group();
    spinner.add(mesh(new THREE.BoxGeometry(0.62, 0.02, 0.1), mat(0xffd21a), { shadow: false }));
    spinner.add(mesh(new THREE.BoxGeometry(0.1, 0.02, 0.62), mat(0xd8312e), { shadow: false }));
    spinner.position.y = 1.33;
    acc.add(spinner);
    m.spinner = spinner;
    const screenMat = new THREE.MeshStandardMaterial({ color: 0x102010, emissive: 0x9aff6a, emissiveIntensity: 1.3, roughness: 0.4 });
    const handheld = new THREE.Group();
    handheld.add(mesh(new THREE.BoxGeometry(0.42, 0.58, 0.08), mat(0xc8c8d0)));
    handheld.add(mesh(new THREE.PlaneGeometry(0.3, 0.22), screenMat, { y: 0.1, z: 0.045, shadow: false }));
    handheld.add(mesh(new THREE.BoxGeometry(0.12, 0.04, 0.03), mat(0x2a2a34), { x: -0.1, y: -0.14, z: 0.045 }));
    handheld.add(mesh(new THREE.BoxGeometry(0.04, 0.12, 0.03), mat(0x2a2a34), { x: -0.1, y: -0.14, z: 0.045 }));
    for (const [x, y] of [[0.1, -0.12], [0.16, -0.17]]) handheld.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 8), mat(0xd8312e), { x, y, z: 0.045, rx: Math.PI / 2 }));
    handheld.position.set(0, 0.05, 0.7);
    handheld.rotation.set(-0.5, 0, 0); // screen tilted up so you can see his game
    acc.add(handheld);
    m.screenMat = screenMat;
    // a swirly lollipop
    prop = new THREE.Group();
    prop.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.4, 4), mat(0xf6f2ea)));
    prop.add(mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.03, 12), mat(0xff7ad9), { y: 0.26, rx: Math.PI / 2 }));
  }
  if (prop) {
    m.arms[1].add(prop);
    prop.position.add(new THREE.Vector3(0.12, 0.05, 0.12));
  }
  m.accessory = acc;
  m.prop = prop;
  return m;
}

// ---------------------------------------------------------------
// GRUMBLECLAW — Dining Room boss (Goon / Demon spirit)
export function buildBoss() {
  const g = new THREE.Group();
  const inner = new THREE.Group();
  g.add(inner);
  const color = 0x93357f;
  const bodyMat = new THREE.MeshStandardMaterial({
    color, emissive: 0x5a1050, emissiveIntensity: 0.7, transparent: true, opacity: 0.85,
    roughness: 0.4, flatShading: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const profile = [
    [0, 1.25], [0.5, 1.2], [0.85, 1.0], [1.05, 0.7], [1.15, 0.3], [1.12, -0.1],
    [0.95, -0.45], [0.7, -0.75], [0.42, -1.0], [0.15, -1.2], [0.02, -1.3],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 12), bodyMat);
  inner.add(body);
  // belly
  inner.add(mesh(new THREE.SphereGeometry(0.75, 10, 6), new THREE.MeshStandardMaterial({ color: 0xd88ac0, emissive: 0x4a1040, transparent: true, opacity: 0.8, flatShading: true, depthWrite: false }), { y: -0.05, z: 0.45, sz: 0.6, shadow: false }));
  // bib napkin
  inner.add(mesh(new THREE.ConeGeometry(0.55, 0.7, 3), mat(0xf6eedb, { side: THREE.DoubleSide }), { y: 0.25, z: 0.78, rx: Math.PI + 0.3, ry: Math.PI, sz: 0.3, shadow: false }));
  // horns
  const hornMat = mat(0xe8d9b0);
  inner.add(mesh(new THREE.ConeGeometry(0.16, 0.7, 6), hornMat, { x: -0.55, y: 1.35, rz: 0.55 }));
  inner.add(mesh(new THREE.ConeGeometry(0.16, 0.7, 6), hornMat, { x: 0.55, y: 1.35, rz: -0.55 }));
  // brows + eyes
  const eyeMat = glowMat(0xffe040, 3);
  const eyeL = mesh(new THREE.BoxGeometry(0.3, 0.18, 0.08), eyeMat, { x: -0.32, y: 0.8, z: 0.92, rz: -0.2, shadow: false });
  const eyeR = mesh(new THREE.BoxGeometry(0.3, 0.18, 0.08), eyeMat, { x: 0.32, y: 0.8, z: 0.92, rz: 0.2, shadow: false });
  inner.add(eyeL, eyeR);
  inner.add(mesh(new THREE.BoxGeometry(0.08, 0.14, 0.04), new THREE.MeshBasicMaterial({ color: 0x1a0010 }), { x: -0.3, y: 0.8, z: 0.97, shadow: false }));
  inner.add(mesh(new THREE.BoxGeometry(0.08, 0.14, 0.04), new THREE.MeshBasicMaterial({ color: 0x1a0010 }), { x: 0.3, y: 0.8, z: 0.97, shadow: false }));
  const eyeGlow = glowSprite(0xffe040, 1.6, 0.6);
  eyeGlow.position.set(0, 0.8, 1.0);
  inner.add(eyeGlow);
  // jaw with fangs
  const jaw = new THREE.Group();
  jaw.position.set(0, 0.45, 0.85);
  const mouthMat = new THREE.MeshBasicMaterial({ color: 0x1a0010 });
  jaw.add(mesh(new THREE.BoxGeometry(0.8, 0.12, 0.2), mouthMat, { shadow: false }));
  const fangMat = mat(0xfff6e0);
  for (let i = 0; i < 5; i++) jaw.add(mesh(new THREE.ConeGeometry(0.045, 0.14, 4), fangMat, { x: -0.3 + i * 0.15, y: 0.1, z: 0.06, shadow: false }));
  inner.add(jaw);
  const upper = mesh(new THREE.BoxGeometry(0.8, 0.1, 0.2), mouthMat, { y: 0.6, z: 0.85, shadow: false });
  inner.add(upper);
  for (let i = 0; i < 4; i++) inner.add(mesh(new THREE.ConeGeometry(0.05, 0.16, 4), fangMat, { x: -0.22 + i * 0.15, y: 0.5, z: 0.92, rx: Math.PI, shadow: false }));
  // claw arms
  const makeArm = (side) => {
    const pivot = new THREE.Group();
    pivot.position.set(1.05 * side, 0.4, 0.2);
    pivot.add(mesh(new THREE.IcosahedronGeometry(0.32, 0), bodyMat.clone(), { x: 0.25 * side, shadow: false }));
    for (let i = 0; i < 3; i++) {
      pivot.add(mesh(new THREE.ConeGeometry(0.06, 0.32, 4), fangMat, { x: 0.38 * side, y: -0.1 + i * 0.1, z: 0.25, rx: Math.PI / 2 }));
    }
    inner.add(pivot);
    return pivot;
  };
  const armL = makeArm(-1);
  const armR = makeArm(1);
  // drumstick held in right claw
  const food = new THREE.Group();
  food.add(mesh(new THREE.SphereGeometry(0.18, 7, 5), mat(0xc87a3a), { sy: 1.3 }));
  food.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.25, 5), mat(0xf6eedb), { y: -0.3 }));
  food.position.set(0.45, 0.1, 0.35);
  armR.add(food);
  const glow = glowSprite(color, 5.5, 0.38);
  g.add(glow);

  const heartMat = new THREE.SpriteMaterial({ map: makeHeartTexture(300), transparent: true, depthTest: false });
  const heart = new THREE.Sprite(heartMat);
  heart.scale.set(1.0, 1.0, 1.0);
  heart.position.set(0, 2.4, 0);
  heart.visible = false;
  heart.renderOrder = 10;
  g.add(heart);
  let lastHp = 300;
  const setHeart = (hp) => {
    const v = Math.ceil(hp);
    if (v === lastHp) return;
    lastHp = v;
    heartMat.map.dispose();
    heartMat.map = makeHeartTexture(v);
    heartMat.needsUpdate = true;
  };

  const bossHeart = buildHeart3D(0.38);
  bossHeart.position.set(0, 0.35, 0.35);
  bossHeart.visible = false;
  inner.add(bossHeart);
  const animateBoss = makeGhostAnimator(body, bossHeart, 0.1, 0.1);

  return {
    group: g, inner, body, bodyMat, armMat: armL.children[0].material, eyes: [eyeL, eyeR], jaw, arms: [armL, armR], food, glow, eyeGlow, heart, setHeart,
    color, name: 'Grumbleclaw', heart3d: bossHeart, animate: animateBoss,
  };
}

// ---------------------------------------------------------------
// Framed portrait used for wall paintings
export function buildPortraitFrame(texture, w = 1.2, h = 1.2, frameColor = 0xc9952e) {
  const g = new THREE.Group();
  const fm = new THREE.MeshStandardMaterial({ color: frameColor, roughness: 0.35, metalness: 0.7, flatShading: true });
  const t = 0.12;
  const d = 0.08;
  const top = mesh(new THREE.BoxGeometry(w + t * 2, t, d), fm, { y: h / 2 + t / 2 });
  const bot = mesh(new THREE.BoxGeometry(w + t * 2, t, d), fm, { y: -h / 2 - t / 2 });
  const left = mesh(new THREE.BoxGeometry(t, h, d), fm, { x: -w / 2 - t / 2 });
  const right = mesh(new THREE.BoxGeometry(t, h, d), fm, { x: w / 2 + t / 2 });
  g.add(top, bot, left, right);
  // corner ornaments
  for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    g.add(mesh(new THREE.IcosahedronGeometry(0.08, 0), fm, { x: x * (w / 2 + t / 2), y: y * (h / 2 + t / 2), z: 0.04 }));
  }
  const canvasMat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 });
  const art = new THREE.Mesh(new THREE.PlaneGeometry(w, h), canvasMat);
  art.position.z = 0.01;
  art.receiveShadow = true;
  g.add(art);
  g.userData.art = art;
  return g;
}

export { GHOST_KINDS };

// ---------------------------------------------------------------
// Ghost internals: beating heart + floating tail
function buildHeart3D(size = 0.22) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({
    color: 0xff2d5a, emissive: 0xff1040, emissiveIntensity: 1.6, roughness: 0.35, flatShading: true,
    transparent: true, opacity: 0.95, depthWrite: false,
  });
  const lobeGeo = new THREE.IcosahedronGeometry(size * 0.55, 1);
  const l = new THREE.Mesh(lobeGeo, m);
  l.position.set(-size * 0.38, size * 0.2, 0);
  const r = new THREE.Mesh(lobeGeo, m);
  r.position.set(size * 0.38, size * 0.2, 0);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(size * 0.82, size * 1.1, 6), m);
  tip.rotation.z = Math.PI;
  tip.position.y = -size * 0.45;
  g.add(l, r, tip);
  const glow = glowSprite(0xff3b6b, size * 6, 0.55);
  g.add(glow);
  g.renderOrder = 6;
  g.userData.mat = m;
  g.userData.glow = glow;
  return g;
}

// Returns animate(t, dt, heartVisible): wavy tail sway + heartbeat.
function makeGhostAnimator(body, heart3d, tailTop = 0.15, amount = 0.14) {
  const pos = body.geometry.attributes.position;
  const base = pos.array.slice();
  let beat = 0;
  return (t, dt, heartVisible = false) => {
    const arr = pos.array;
    for (let i = 0; i < arr.length; i += 3) {
      const y = base[i + 1];
      if (y >= tailTop) continue;
      const k = (tailTop - y) / (tailTop + 1.3); // 0 at the waist → ~1 at the tip
      const w = Math.sin(t * 3.4 - y * 5) * amount * k;
      const w2 = Math.cos(t * 2.6 - y * 4) * amount * 0.7 * k;
      arr[i] = base[i] + w;
      arr[i + 2] = base[i + 2] + w2 - k * k * amount * 0.8; // trail behind
    }
    pos.needsUpdate = true;
    body.geometry.computeVertexNormals();

    heart3d.visible = heartVisible;
    if (heartVisible) {
      beat += dt * 8.5;
      // lub-dub: two quick pulses per cycle
      const ph = beat % (Math.PI * 2);
      const pulse = Math.max(0, Math.sin(ph * 2)) * (ph < Math.PI ? 1 : 0.55);
      const s = 1 + pulse * 0.28;
      heart3d.scale.set(s, s, s);
      heart3d.rotation.y = Math.sin(t * 1.5) * 0.4;
      heart3d.userData.mat.emissiveIntensity = 1.3 + pulse * 1.5;
      heart3d.userData.glow.material.opacity = 0.35 + pulse * 0.45;
    }
  };
}

// ---------------------------------------------------------------
// MANSION PROPS
const PROP = {
  darkWood: mat(0x3a1f0e),
  wood: mat(0x6a3a1a),
  gold: mat(0xc9952e, { metalness: 0.75, roughness: 0.35 }),
  brass: mat(0xb88a3a, { metalness: 0.7, roughness: 0.3 }),
  iron: mat(0x2a2a30, { metalness: 0.6, roughness: 0.45 }),
  candle: mat(0xf3ead0, { emissive: 0x3a2a10, emissiveIntensity: 0.4 }),
  flame: new THREE.MeshBasicMaterial({ color: 0xffd27a }),
  crystal: new THREE.MeshStandardMaterial({ color: 0xdff6ff, transparent: true, opacity: 0.7, roughness: 0.05, flatShading: true }),
};

function candle(group, x, y, z, h = 0.25, glowSize = 0.6) {
  group.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, h, 6), PROP.candle, { x, y: y + h / 2, z, shadow: false }));
  const fl = mesh(new THREE.ConeGeometry(0.04, 0.12, 5), PROP.flame, { x, y: y + h + 0.07, z, shadow: false });
  group.add(fl);
  const s = glowSprite(0xffc070, glowSize, 0.6);
  s.position.set(x, y + h + 0.09, z);
  group.add(s);
  return { flame: fl, glow: s };
}

// Chandelier: brass ring, 8 candles with glow sprites, crystal drops
export function buildChandelier(radius = 0.9, arms = 8) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 4), PROP.iron, { y: 0.5, shadow: false }));
  g.add(mesh(new THREE.TorusGeometry(radius, 0.05, 6, 18), PROP.gold, { rx: Math.PI / 2 }));
  g.add(mesh(new THREE.TorusGeometry(radius * 0.5, 0.035, 5, 14), PROP.gold, { y: 0.3, rx: Math.PI / 2 }));
  g.add(mesh(new THREE.IcosahedronGeometry(0.22, 0), PROP.gold));
  g.add(mesh(new THREE.ConeGeometry(0.12, 0.35, 6), PROP.gold, { y: -0.3, rx: Math.PI }));
  const flames = [];
  for (let i = 0; i < arms; i++) {
    const a = (i / arms) * Math.PI * 2;
    const x = Math.cos(a) * radius;
    const z = Math.sin(a) * radius;
    const c = candle(g, x, 0.03, z);
    flames.push(c.glow);
    g.add(mesh(new THREE.OctahedronGeometry(0.06, 0), PROP.crystal, { x: x * 0.8, y: -0.25, z: z * 0.8, sy: 1.6, shadow: false }));
    g.add(mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.22, 3), PROP.brass, { x: x * 0.8, y: -0.12, z: z * 0.8, shadow: false }));
  }
  g.userData.flames = flames;
  return g;
}

// Wall sconce (faces +z). userData.flame is the flicker sprite.
export function buildSconce() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.2, 0.4, 0.06), PROP.brass, { shadow: false }));
  g.add(mesh(new THREE.TorusGeometry(0.08, 0.02, 4, 10), PROP.brass, { y: 0.14, z: 0.03, shadow: false }));
  g.add(mesh(new THREE.BoxGeometry(0.06, 0.06, 0.35), PROP.brass, { y: -0.05, z: 0.18, shadow: false }));
  g.add(mesh(new THREE.CylinderGeometry(0.1, 0.06, 0.05, 8), PROP.brass, { y: -0.05, z: 0.33, shadow: false }));
  const c = candle(g, 0, -0.03, 0.33, 0.22, 0.9);
  g.userData.flame = c.glow;
  return g;
}

// Velvet armchair (front = +z)
export function buildArmchair(fabric = mat(0x1f5a3a)) {
  const g = new THREE.Group();
  const cushion = mat(new THREE.Color(fabric.color).multiplyScalar(1.25).getHex());
  g.add(mesh(new THREE.BoxGeometry(1.1, 0.45, 1.0), fabric, { y: 0.38 }));
  g.add(mesh(new THREE.BoxGeometry(1.1, 1.0, 0.25), fabric, { y: 0.95, z: -0.4 }));
  g.add(mesh(new THREE.BoxGeometry(0.22, 0.65, 1.0), fabric, { x: -0.5, y: 0.65 }));
  g.add(mesh(new THREE.BoxGeometry(0.22, 0.65, 1.0), fabric, { x: 0.5, y: 0.65 }));
  g.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.0, 8), fabric, { x: -0.5, y: 0.98, rx: Math.PI / 2 }));
  g.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.0, 8), fabric, { x: 0.5, y: 0.98, rx: Math.PI / 2 }));
  g.add(mesh(new THREE.BoxGeometry(0.75, 0.14, 0.75), cushion, { y: 0.66, z: 0.05 }));
  // buttons on the back
  for (let i = 0; i < 3; i++) g.add(mesh(new THREE.SphereGeometry(0.03, 4, 3), PROP.gold, { x: -0.25 + i * 0.25, y: 1.1, z: -0.27, shadow: false }));
  for (const [x, z] of [[-0.45, -0.4], [0.45, -0.4], [-0.45, 0.4], [0.45, 0.4]]) {
    g.add(mesh(new THREE.CylinderGeometry(0.05, 0.03, 0.18, 5), PROP.darkWood, { x, y: 0.09, z }));
  }
  return g;
}

// Pleated curtain panel; animate it with Curtain (Interactable.js)
export function buildCurtainCloth(w = 1.0, h = 3.2, color = 0x7a1a28) {
  const geo = new THREE.PlaneGeometry(w, h, 6, 10);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 18) * 0.04);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat(color, { side: THREE.DoubleSide, roughness: 0.9 }));
  m.castShadow = true;
  // gold tie-back tassel
  const tassel = mesh(new THREE.ConeGeometry(0.06, 0.2, 5), PROP.gold, { x: 0, y: -h * 0.15, z: 0.08, shadow: false });
  m.add(tassel);
  return m;
}

// Long banquet table with draped cloth. Origin on the floor at its centre.
export function buildBanquetTable(w = 12.8, d = 2.4, clothTex = null) {
  const g = new THREE.Group();
  const cloth = mat(0xffffff, { map: clothTex, flatShading: false });
  g.add(mesh(new THREE.BoxGeometry(w, 0.1, d), cloth, { y: 1.0 }));
  g.add(mesh(new THREE.BoxGeometry(w + 0.1, 0.55, d + 0.1), cloth, { y: 0.7 }));
  // scalloped hem
  const hemMat = mat(0xd6a647);
  for (let x = -w / 2 + 0.3; x <= w / 2 - 0.2; x += 0.6) {
    g.add(mesh(new THREE.SphereGeometry(0.06, 5, 3), hemMat, { x, y: 0.43, z: d / 2 + 0.06, shadow: false }));
    g.add(mesh(new THREE.SphereGeometry(0.06, 5, 3), hemMat, { x, y: 0.43, z: -d / 2 - 0.06, shadow: false }));
  }
  for (const x of [-w / 2 + 0.3, 0, w / 2 - 0.3]) {
    for (const z of [-d / 2 + 0.3, d / 2 - 0.3]) {
      g.add(mesh(new THREE.CylinderGeometry(0.1, 0.07, 0.45, 6), PROP.darkWood, { x, y: 0.22, z }));
    }
  }
  // candelabra centrepiece
  const cb = new THREE.Group();
  cb.add(mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.05, 8), PROP.brass, { shadow: false }));
  cb.add(mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.4, 6), PROP.brass, { y: 0.22, shadow: false }));
  candle(cb, 0, 0.42, 0, 0.2, 0.5);
  cb.position.set(0, 1.05, 0);
  g.add(cb);
  return g;
}

// Creaky door leaf hung from a hinge at its left edge (local x = 0).
export function buildDoorLeaf(w = 3.0, h = 3.6, faceTex = null) {
  const hinge = new THREE.Group();
  const side = mat(0x3a1f0e);
  const face = mat(0xffffff, { map: faceTex, flatShading: false });
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(w - 0.06, h, 0.14), [side, side, side, side, face, face]);
  leaf.position.set(w / 2, h / 2, 0);
  leaf.castShadow = true;
  leaf.receiveShadow = true;
  hinge.add(leaf);
  for (const sz of [1, -1]) {
    hinge.add(mesh(new THREE.SphereGeometry(0.09, 8, 6), PROP.gold, { x: w - 0.35, y: 1.7, z: sz * 0.12 }));
    hinge.add(mesh(new THREE.BoxGeometry(0.12, 0.3, 0.03), PROP.gold, { x: w - 0.35, y: 1.6, z: sz * 0.085, shadow: false }));
  }
  // iron hinge straps
  for (const y of [0.5, h - 0.5]) {
    hinge.add(mesh(new THREE.BoxGeometry(0.7, 0.1, 0.17), PROP.iron, { x: 0.35, y, shadow: false }));
    hinge.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 6), PROP.iron, { x: 0.02, y, shadow: false }));
  }
  return hinge;
}

// Ornate treasure chest with hinged lid. Returns { group, lid, glow }.
export function buildChest() {
  const g = new THREE.Group();
  const body = mat(0x7a4a1a);
  g.add(mesh(new THREE.BoxGeometry(1.0, 0.55, 0.65), body, { y: 0.28 }));
  g.add(mesh(new THREE.BoxGeometry(1.04, 0.08, 0.69), PROP.gold, { y: 0.05 }));
  g.add(mesh(new THREE.BoxGeometry(0.08, 0.56, 0.69), PROP.gold, { x: -0.35, y: 0.28 }));
  g.add(mesh(new THREE.BoxGeometry(0.08, 0.56, 0.69), PROP.gold, { x: 0.35, y: 0.28 }));
  for (const x of [-0.48, 0.48]) for (const z of [-0.3, 0.3]) g.add(mesh(new THREE.SphereGeometry(0.05, 5, 4), PROP.gold, { x, y: 0.04, z, shadow: false }));
  const lid = new THREE.Group();
  lid.position.set(0, 0.55, -0.32);
  const lidMesh = mesh(new THREE.CylinderGeometry(0.33, 0.33, 1.0, 8, 1, false, 0, Math.PI), body, { z: 0.32, rz: Math.PI / 2 });
  lid.add(lidMesh);
  lid.add(mesh(new THREE.CylinderGeometry(0.335, 0.335, 0.08, 8, 1, false, 0, Math.PI), PROP.gold, { x: -0.35, z: 0.32, rz: Math.PI / 2 }));
  lid.add(mesh(new THREE.CylinderGeometry(0.335, 0.335, 0.08, 8, 1, false, 0, Math.PI), PROP.gold, { x: 0.35, z: 0.32, rz: Math.PI / 2 }));
  lid.add(mesh(new THREE.BoxGeometry(0.14, 0.18, 0.06), PROP.gold, { z: 0.66 }));
  lid.add(mesh(new THREE.TorusGeometry(0.04, 0.012, 4, 8), PROP.iron, { y: -0.08, z: 0.7, shadow: false }));
  g.add(lid);
  const glow = glowSprite(0xffd23a, 1.8, 0.5);
  glow.position.y = 0.7;
  g.add(glow);
  return { group: g, lid, glow };
}

// ---------------------------------------------------------------
// BOO — round, shy mansion ghost that hides inside furniture in rooms
// you've already lit. Covers its face when you look at it.
export function buildBoo() {
  const color = 0xf2f4ff;
  const g = new THREE.Group();
  const inner = new THREE.Group();
  g.add(inner);
  const bodyMat = new THREE.MeshStandardMaterial({
    color, emissive: 0xdfe6ff, emissiveIntensity: 0.45, transparent: true, opacity: 0.85,
    roughness: 0.35, flatShading: true, depthWrite: false,
  });
  const body = mesh(new THREE.IcosahedronGeometry(0.62, 2), bodyMat, { y: 0.45, shadow: false });
  inner.add(body);
  // curled tail flicking up at the back
  const tail = mesh(new THREE.ConeGeometry(0.22, 0.6, 7), bodyMat, { y: 0.32, z: -0.62, rx: -2.1, shadow: false });
  inner.add(tail);
  // round black eyes with a glint
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0a0a14 });
  const eyeL = mesh(new THREE.SphereGeometry(0.09, 8, 6), eyeMat, { x: -0.2, y: 0.62, z: 0.55, sy: 1.5, sz: 0.5, shadow: false });
  const eyeR = mesh(new THREE.SphereGeometry(0.09, 8, 6), eyeMat, { x: 0.2, y: 0.62, z: 0.55, sy: 1.5, sz: 0.5, shadow: false });
  const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  eyeL.add(mesh(new THREE.SphereGeometry(0.03, 5, 4), glintMat, { x: 0.03, y: 0.04, z: 0.07, shadow: false }));
  eyeR.add(mesh(new THREE.SphereGeometry(0.03, 5, 4), glintMat, { x: 0.03, y: 0.04, z: 0.07, shadow: false }));
  inner.add(eyeL, eyeR);
  // big open grin with two fangs and a long tongue
  const mouth = mesh(new THREE.SphereGeometry(0.26, 10, 6), new THREE.MeshBasicMaterial({ color: 0x3a0818 }), { y: 0.3, z: 0.5, sx: 1.25, sy: 0.75, sz: 0.4, shadow: false });
  inner.add(mouth);
  const fangMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  inner.add(mesh(new THREE.ConeGeometry(0.045, 0.11, 4), fangMat, { x: -0.13, y: 0.45, z: 0.6, rx: Math.PI, shadow: false }));
  inner.add(mesh(new THREE.ConeGeometry(0.045, 0.11, 4), fangMat, { x: 0.13, y: 0.45, z: 0.6, rx: Math.PI, shadow: false }));
  const tongue = mesh(new THREE.SphereGeometry(0.11, 8, 5), new THREE.MeshBasicMaterial({ color: 0xff5f8f }), { y: 0.12, z: 0.62, sx: 1, sy: 1.7, sz: 0.5, shadow: false });
  inner.add(tongue);
  // stubby arms: hang at the sides, or cover the face when shy
  const armMat = bodyMat.clone();
  const armL = mesh(new THREE.SphereGeometry(0.16, 8, 6), armMat, { x: -0.6, y: 0.35, z: 0.15, shadow: false });
  const armR = mesh(new THREE.SphereGeometry(0.16, 8, 6), armMat, { x: 0.6, y: 0.35, z: 0.15, shadow: false });
  inner.add(armL, armR);
  const glow = glowSprite(0xcfe0ff, 2.6, 0.35);
  glow.position.y = 0.45;
  g.add(glow);

  const heartMat = new THREE.SpriteMaterial({ map: makeHeartTexture(100), transparent: true, depthTest: false });
  const heart = new THREE.Sprite(heartMat);
  heart.scale.set(0.7, 0.7, 0.7);
  heart.position.set(0, 1.5, 0);
  heart.visible = false;
  heart.renderOrder = 10;
  g.add(heart);
  let lastHp = 100;
  const setHeart = (hp) => {
    const v = Math.ceil(hp);
    if (v === lastHp) return;
    lastHp = v;
    heartMat.map.dispose();
    heartMat.map = makeHeartTexture(v);
    heartMat.needsUpdate = true;
  };
  const heart3d = buildHeart3D(0.2);
  heart3d.position.set(0, 0.45, 0.1);
  heart3d.visible = false;
  inner.add(heart3d);

  return {
    group: g, inner, body, tail, bodyMat, armMat, eyes: [eyeL, eyeR], mouth, tongue, arms: [armL, armR], glow, heart, setHeart,
    heart3d, color, name: 'Boo',
  };
}

// ---------------------------------------------------------------
// KEY — pops out of a reward chest; opens one locked door
export function buildKey() {
  const g = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({ color: 0xffc83a, emissive: 0xffa010, emissiveIntensity: 0.9, metalness: 0.7, roughness: 0.3, flatShading: true });
  g.add(mesh(new THREE.TorusGeometry(0.18, 0.05, 6, 14), gold, { y: 0.28, shadow: false }));
  g.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6), gold, { y: -0.08, shadow: false }));
  g.add(mesh(new THREE.BoxGeometry(0.14, 0.06, 0.04), gold, { x: 0.07, y: -0.24, shadow: false }));
  g.add(mesh(new THREE.BoxGeometry(0.1, 0.06, 0.04), gold, { x: 0.05, y: -0.12, shadow: false }));
  const glow = glowSprite(0xffd23a, 1.6, 0.6);
  g.add(glow);
  g.userData.glow = glow;
  return g;
}
