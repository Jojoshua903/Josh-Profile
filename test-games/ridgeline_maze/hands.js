// Ridgeline first-person hands: drawn on top of the world for each local climber.
import { THREE, flake } from './world.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const vmScene = new THREE.Scene();
vmScene.add(new THREE.HemisphereLight(0xfff1e0, 0x8899bb, 1.7));
const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(1, 2, 1.5); vmScene.add(key);
const vmCam = new THREE.PerspectiveCamera(58, 1, .01, 10);

function makeArm(color, side, look = {}) {
  const jacket = new THREE.MeshStandardMaterial({ color: look.outfit === 2 && look.skin ? look.skin : color, roughness: .75 });
  const g = new THREE.Group();
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(.046, .056, .55, 12), jacket);
  sleeve.rotation.x = Math.PI / 2; sleeve.position.z = .2; g.add(sleeve);
  const cuff = new THREE.Mesh(new THREE.TorusGeometry(.05, .02, 8, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .8 }));
  cuff.position.z = -.04; g.add(cuff);
  const mitt = new THREE.Mesh(new THREE.SphereGeometry(.09, 14, 10), new THREE.MeshStandardMaterial({ color: look.gloves || 0x27303b, roughness: .8 }));
  mitt.scale.set(1, .82, 1.25); mitt.position.z = -.11; g.add(mitt);
  const thumb = new THREE.Mesh(new THREE.SphereGeometry(.035, 8, 6), mitt.material);
  thumb.position.set(-side * .07, .03, -.1); g.add(thumb);
  const hold = new THREE.Group(); hold.position.set(0, .04, -.16); g.add(hold);
  return { g, mitt, hold };
}

export function makeViewmodel(color, look = {}) {
  const root = new THREE.Group(); root.visible = false; vmScene.add(root);
  const R = makeArm(color, 1, look), L = makeArm(color, -1, look);
  root.add(R.g, L.g);
  // tools
  const chalk = new THREE.Group();
  const stickC = new THREE.Mesh(new THREE.BoxGeometry(.036, .036, .17), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .95 }));
  const tip = new THREE.Mesh(new THREE.BoxGeometry(.038, .038, .04), new THREE.MeshBasicMaterial({ color, toneMapped: false }));
  tip.position.z = -.085; chalk.add(stickC, tip); chalk.rotation.x = -.5;
  const stick = new THREE.Group();
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(.026, .026, .24, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).lerp(new THREE.Color(0xffffff), .3), toneMapped: false }));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: flake, color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false }));
  halo.scale.set(.32, .32, 1); stick.add(tube, halo); stick.rotation.x = .3;
  R.hold.add(chalk, stick);
  // folded paper trail map held up in the left hand
  const map = new THREE.Group();
  const paper = new THREE.Mesh(new THREE.BoxGeometry(.3, .006, .22), new THREE.MeshStandardMaterial({ color: 0xefe0bd, roughness: .95 }));
  const ink = new THREE.Mesh(new THREE.BoxGeometry(.22, .007, .015), new THREE.MeshBasicMaterial({ color: 0x5b4630 }));
  ink.position.set(0, .002, .02); ink.rotation.y = .5; const ink2 = ink.clone(); ink2.position.set(.03, .002, -.05); ink2.rotation.y = -.8;
  const dot = new THREE.Mesh(new THREE.BoxGeometry(.025, .008, .025), new THREE.MeshBasicMaterial({ color: 0xe5383b })); dot.position.set(.09, .003, -.06);
  map.add(paper, ink, ink2, dot); map.position.set(.04, .05, -.16); map.rotation.set(1.15, 0, -.25); L.g.add(map); map.visible = false;
  return { root, R, L, chalk, stick, halo, map, slot: -1, shown: 0, switchT: 0, useT: 0, useKind: '', hideStick: 0, sx: 0, sy: 0, lastYaw: null, lastPitch: 0, landY: 0 };
}
export function disposeViewmodel(vm) { vmScene.remove(vm.root); }
/** kind: 'chalk' | 'throw' | 'push' */
export function vmUse(vm, kind) { vm.useKind = kind; vm.useT = kind === 'throw' ? .55 : kind === 'push' ? .45 : .32; if (kind === 'throw') vm.hideStick = .7; }

const ease = (x) => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
export function animateViewmodel(vm, p, dt, t) {
  vm.root.visible = p.st !== 2;
  if (!vm.root.visible) return;
  // tool switching: drop the hand out of view, swap, bring it back up
  if (vm.slot === -1) { vm.slot = vm.shown = p.slot; }
  if (p.slot !== vm.slot) { vm.slot = p.slot; vm.switchT = .36; }
  if (vm.switchT > 0) { vm.switchT -= dt; if (vm.switchT < .18) vm.shown = vm.slot; }
  vm.hideStick = Math.max(0, vm.hideStick - dt);
  vm.chalk.visible = vm.shown === 0;
  vm.stick.visible = vm.shown === 1 && p.sticks > 0 && vm.hideStick <= 0;
  vm.map.visible = vm.shown === 3;
  vm.halo.material.opacity = .7 + Math.sin(t * 6) * .2;

  // sway from turning (the hand lags behind the camera)
  if (vm.lastYaw === null) vm.lastYaw = p.yaw;
  let dy = p.yaw - vm.lastYaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  const dp = p.pitch - vm.lastPitch; vm.lastYaw = p.yaw; vm.lastPitch = p.pitch;
  vm.sx += (clamp(dy * 2.2, -.12, .12) - vm.sx) * Math.min(1, dt * 10);
  vm.sy += (clamp(-dp * 2.2, -.1, .1) - vm.sy) * Math.min(1, dt * 10);

  const speed = Math.hypot(p.vxLast || 0, p.vzLast || 0), walk = clamp(speed / 3, 0, 1);
  const B = (p.bobScale ?? 1);
  let x = .3, y = -.3, z = -.46, rx = 0, ry = 0, rz = 0;
  // walk bob in a figure-eight, bigger when sprinting
  const amp = (p.sprinting ? 1.8 : 1) * walk * B;
  x += Math.cos(p.phase) * .022 * amp; y -= Math.abs(Math.sin(p.phase)) * .03 * amp;
  if (p.sprinting) { y -= .07; rx = -.25 + Math.sin(p.phase) * .25; rz = .25; z += .05; }
  // breathing when still, heavier when tired
  const tired = p.exhausted || p.stamina < .25;
  y += Math.sin(t * (tired ? 5 : 1.8)) * (tired ? .014 : .006) * (1 - walk * .7);
  if (tired) { y -= .04; rx += .1; }
  // air and landing
  if (!p.ground) y += clamp((p.vy || 0) * -.006, -.03, .05);
  vm.landY += ((p.land || 0) * -.1 - vm.landY) * Math.min(1, dt * 14);
  y += vm.landY;
  // sway
  x -= vm.sx; y += vm.sy; ry = -vm.sx * 1.4; rz -= vm.sx * 1.2;
  // tool switch dip
  if (vm.switchT > 0) { const s = Math.sin((vm.switchT / .36) * Math.PI); y -= s * .3; rx += s * .6; }

  let lx = -.3, ly = -.75, lz = -.46, lrx = 0; // left arm hidden below unless needed
  // use animations
  if (vm.useT > 0) {
    vm.useT -= dt;
    if (vm.useKind === 'chalk') { const k = 1 - vm.useT / .32, s = Math.sin(k * Math.PI); z -= s * .16; x -= Math.sin(k * Math.PI * 2) * .05; rz += Math.sin(k * Math.PI * 2) * .5; rx -= s * .2; }
    if (vm.useKind === 'throw') {
      const k = 1 - vm.useT / .55;
      if (k < .4) { const e = ease(k / .4); y += e * .14; z += e * .1; rx += e * .9; }
      else { const e = ease((k - .4) / .6); y += .14 - e * .2; z += .1 - e * .3; rx += .9 - e * 1.5; }
    }
    if (vm.useKind === 'push') { const s = Math.sin((1 - vm.useT / .45) * Math.PI); z -= s * .28; x -= s * .1; ly = -.3 + (1 - s) * -.3; lz = -.46 - s * .28; lx = -.2 + s * .0; }
  }
  // map out: raise the left hand and look at it
  if (vm.shown === 3 && vm.switchT <= 0) { lx = -.17; ly = -.3; lz = -.42; lrx = -.15; }
  // crank: both hands out front turning a wheel
  if (p.crank >= 0) {
    const c = t * 7;
    x = .12 + Math.cos(c) * .07; y = -.24 + Math.sin(c) * .07; z = -.52; rx = .2; rz = 0;
    lx = -.12 + Math.cos(c) * .07; ly = -.24 + Math.sin(c) * .07; lz = -.52; lrx = .2;
  }
  // climbing: both mittens grab the rock in front, hand over hand
  if (p.climbing) { const c = p.climbPh || 0, a = Math.sin(c); x = .2; y = -.12 + Math.max(0, a) * .2; z = -.42; rx = 1.1; rz = -.2; lx = -.2; ly = -.12 + Math.max(0, -a) * .2; lz = -.42; lrx = 1.1; }
  const kk = Math.min(1, dt * 18);
  const g = vm.R.g; g.position.x += (x - g.position.x) * kk; g.position.y += (y - g.position.y) * kk; g.position.z += (z - g.position.z) * kk;
  g.rotation.x += (rx - g.rotation.x) * kk; g.rotation.y += (ry - g.rotation.y) * kk; g.rotation.z += (rz - g.rotation.z) * kk;
  const l = vm.L.g; l.position.x += (lx - l.position.x) * kk; l.position.y += (ly - l.position.y) * kk; l.position.z += (lz - l.position.z) * kk; l.rotation.x += (lrx - l.rotation.x) * kk;
  // open hand in the Hands slot
  vm.R.mitt.scale.set(vm.shown === 2 ? 1.15 : 1, vm.shown === 2 ? .6 : .82, 1.25);
}

/** Draw this climber's hands on top of whatever is already in the viewport. */
export function renderViewmodel(renderer, vm, aspect, vmAll) {
  for (const v of vmAll) v.root.visible = v === vm && v.root.visible;
  vmCam.aspect = aspect; vmCam.updateProjectionMatrix();
  const auto = renderer.autoClear; renderer.autoClear = false;
  renderer.clearDepth(); renderer.render(vmScene, vmCam);
  renderer.autoClear = auto;
}
