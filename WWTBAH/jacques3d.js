// Jacques in real-time 3D: a tall, cel-shaded figure with glasses that glint (and occasionally blind).
import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';

const scene = new THREE.Scene();
const grad = new THREE.DataTexture(new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
const toon = c => new THREE.MeshToonMaterial({color: c, gradientMap: grad});
const outlineMat = new THREE.MeshBasicMaterial({color: 0x22172e, side: THREE.BackSide});
function part(geo, color, s = 1.07){
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo, toon(color)));
  const o = new THREE.Mesh(geo, outlineMat); o.scale.setScalar(s); g.add(o);
  return g;
}
const SKIN = 0xF6C9A4, HAIR = 0x5A3A24, TOP = 0x3A2F52, LEGS = 0x26324F, SHOE = 0x1b1424, RED = 0xFF5A3C;

/* ---------- build Jacques ---------- */
const J = new THREE.Group(); scene.add(J);
// shoes + legs
[-1, 1].forEach(s => {
  const shoe = part(new THREE.BoxGeometry(.36, .18, .62), SHOE, 1.08); shoe.position.set(s * .22, .09, .1); J.add(shoe);
  const leg = part(new THREE.CapsuleGeometry(.15, 1.35, 6, 14), LEGS); leg.position.set(s * .22, 1.0, 0); J.add(leg);
});
// torso (turtleneck) + belt
const torso = new THREE.Group(); torso.position.y = 2.3; J.add(torso);
const chest = part(new THREE.CapsuleGeometry(.38, .95, 8, 20), TOP, 1.05); chest.scale.set(1, 1, .78); torso.add(chest);
const belt = new THREE.Mesh(new THREE.CylinderGeometry(.385, .385, .1, 24), toon(0x1b1424)); belt.position.y = -.55; belt.scale.z = .78; torso.add(belt);
const collar = part(new THREE.CylinderGeometry(.2, .24, .22, 20), TOP, 1.06); collar.position.y = .78; torso.add(collar);
// bow tie
const bow = new THREE.Group(); bow.position.set(0, .72, .3); torso.add(bow);
[-1, 1].forEach(s => { const c = part(new THREE.ConeGeometry(.09, .18, 4), RED, 1.1); c.rotation.z = s * Math.PI / 2; c.position.x = s * .09; bow.add(c); });
bow.add(new THREE.Mesh(new THREE.SphereGeometry(.045, 10, 10), toon(0xC9381F)));
// arms on shoulder pivots
const arms = [-1, 1].map(s => {
  const pivot = new THREE.Group(); pivot.position.set(s * .5, 2.95, 0); J.add(pivot);
  const arm = part(new THREE.CapsuleGeometry(.11, 1.05, 6, 12), TOP); arm.position.y = -.6; pivot.add(arm);
  const hand = part(new THREE.SphereGeometry(.13, 14, 12), SKIN); hand.position.y = -1.22; pivot.add(hand);
  pivot.rotation.z = s * .12; return pivot;
});
// long neck + head
const neck = part(new THREE.CylinderGeometry(.11, .13, .5, 14), SKIN); neck.position.y = 3.25; J.add(neck);
const head = new THREE.Group(); head.position.y = 3.85; J.add(head);
const skull = part(new THREE.SphereGeometry(.42, 32, 24), SKIN, 1.05); skull.scale.set(.9, 1.25, .95); head.add(skull);
const hair = part(new THREE.SphereGeometry(.445, 32, 16, 0, Math.PI * 2, 0, Math.PI * .45), HAIR, 1.04); hair.scale.set(.92, 1.25, .97); hair.position.y = .05; head.add(hair);
const quiff = part(new THREE.SphereGeometry(.2, 16, 12), HAIR, 1.08); quiff.scale.set(1.5, .7, 1); quiff.position.set(.08, .5, .2); quiff.rotation.z = -.4; head.add(quiff);
[-1, 1].forEach(s => { const ear = part(new THREE.SphereGeometry(.08, 12, 10), SKIN, 1.1); ear.scale.set(.6, 1, .8); ear.position.set(s * .39, .02, 0); head.add(ear); });
const nose = part(new THREE.ConeGeometry(.065, .26, 12), SKIN, 1.1); nose.rotation.x = Math.PI / 2; nose.position.set(0, -.08, .45); head.add(nose);
const mouth = new THREE.Mesh(new THREE.TorusGeometry(.1, .018, 8, 20, Math.PI * .8), new THREE.MeshBasicMaterial({color: 0x22172e}));
mouth.rotation.z = Math.PI * 1.15; mouth.position.set(.04, -.3, .37); head.add(mouth);
[-1, 1].forEach(s => { const b = new THREE.Mesh(new THREE.BoxGeometry(.2, .04, .04), new THREE.MeshBasicMaterial({color: 0x3a2618})); b.position.set(s * .17, .27, .38); b.rotation.z = s * -.12; head.add(b); });
// the glasses
function frameGeo(w, h){
  const r = .05, sh = new THREE.Shape();
  const rr = (p, x, y, w, h, r) => { p.moveTo(x + r, y); p.lineTo(x + w - r, y); p.quadraticCurveTo(x + w, y, x + w, y + r); p.lineTo(x + w, y + h - r); p.quadraticCurveTo(x + w, y + h, x + w - r, y + h); p.lineTo(x + r, y + h); p.quadraticCurveTo(x, y + h, x, y + h - r); p.lineTo(x, y + r); p.quadraticCurveTo(x, y, x + r, y); };
  rr(sh, -w / 2, -h / 2, w, h, r);
  const hole = new THREE.Path(); rr(hole, -w / 2 + .04, -h / 2 + .04, w - .08, h - .08, r * .6); sh.holes.push(hole);
  return new THREE.ExtrudeGeometry(sh, {depth: .05, bevelEnabled: false});
}
const glasses = new THREE.Group(); glasses.position.set(0, .1, .41); head.add(glasses);
const lensMat = new THREE.MeshBasicMaterial({color: 0xffffff});
const frameMat = new THREE.MeshBasicMaterial({color: 0x22172e});
const lenses = [-1, 1].map(s => {
  const f = new THREE.Mesh(frameGeo(.32, .22), frameMat); f.position.x = s * .19; glasses.add(f);
  const l = new THREE.Mesh(new THREE.PlaneGeometry(.25, .15), lensMat); l.position.set(s * .19, 0, .03); glasses.add(l);
  return l;
});
const bridge = new THREE.Mesh(new THREE.BoxGeometry(.08, .03, .04), frameMat); bridge.position.set(0, .03, .03); glasses.add(bridge);
[-1, 1].forEach(s => { const arm = new THREE.Mesh(new THREE.BoxGeometry(.03, .03, .42), frameMat); arm.position.set(s * .35, .04, -.2); glasses.add(arm); });

// glare sprites
function glareTex(){
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const rg = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(.18, 'rgba(255,250,215,.9)'); rg.addColorStop(.45, 'rgba(255,230,150,.25)'); rg.addColorStop(1, 'rgba(255,220,120,0)');
  g.fillStyle = rg; g.fillRect(0, 0, 256, 256);
  g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,255,255,.9)';
  [[0, 3], [Math.PI / 2, 3], [Math.PI / 4, 1.5], [-Math.PI / 4, 1.5]].forEach(([a, w]) => {
    g.lineWidth = w; g.beginPath(); g.moveTo(128 - Math.cos(a) * 125, 128 - Math.sin(a) * 125); g.lineTo(128 + Math.cos(a) * 125, 128 + Math.sin(a) * 125); g.stroke();
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const gTex = glareTex();
const glares = lenses.map(l => {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({map: gTex, blending: THREE.AdditiveBlending, depthTest: false, transparent: true}));
  sp.position.copy(l.position).add(new THREE.Vector3(0, 0, .05)); sp.renderOrder = 10; glasses.add(sp); return sp;
});

// floor shadow
const shTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64); rg.addColorStop(0, 'rgba(34,23,46,.35)'); rg.addColorStop(1, 'rgba(34,23,46,0)'); g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c); })();
const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.8, .9), new THREE.MeshBasicMaterial({map: shTex, transparent: true, depthWrite: false}));
shadow.rotation.x = -Math.PI / 2; shadow.position.y = .01; scene.add(shadow);

scene.add(new THREE.HemisphereLight(0xffffff, 0xffd9c9, 1.4));
const sun = new THREE.DirectionalLight(0xffffff, 1.8); sun.position.set(2.5, 5, 4); scene.add(sun);

/* ---------- mounts (one renderer per on-screen slot, shared scene) ---------- */
const mounts = [];
const MAX = 8;
function mount(el){
  el.dataset.m = '1';
  if(mounts.length >= MAX) return;
  let renderer;
  try{ renderer = new THREE.WebGLRenderer({alpha: true, antialias: true}); }catch(e){ return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const cam = new THREE.PerspectiveCamera(30, 1, .1, 100);
  el.appendChild(renderer.domElement); el.classList.add('live');
  const m = {el, renderer, cam, w: 0, h: 0};
  const fit = () => {
    const w = el.clientWidth, h = el.clientHeight; if(!w || !h) return;
    m.w = w; m.h = h; renderer.setSize(w, h, false);
    const aspect = w / h, tan = Math.tan(THREE.MathUtils.degToRad(15));
    cam.aspect = aspect;
    if(aspect < .78){ // full body
      const d = Math.max(4.9 / (2 * tan), 2.0 / (2 * tan * aspect));
      cam.position.set(0, 2.35, d); cam.lookAt(0, 2.3, 0);
    } else { // head and shoulders
      const d = Math.max(1.9 / (2 * tan), 1.7 / (2 * tan * aspect));
      cam.position.set(0, 3.55, d); cam.lookAt(0, 3.45, 0);
    }
    cam.updateProjectionMatrix();
  };
  m.ro = new ResizeObserver(fit); m.ro.observe(el); fit();
  mounts.push(m);
}
function unmount(m){
  m.ro.disconnect(); m.renderer.dispose(); try{ m.renderer.forceContextLoss(); }catch(e){}
  mounts.splice(mounts.indexOf(m), 1);
}
const scan = () => document.querySelectorAll('.j3d:not([data-m])').forEach(mount);
new MutationObserver(scan).observe(document.body, {childList: true, subtree: true});
scan();

/* ---------- animation ---------- */
let flash = 0, flashBig = false, pose = 0;
const ptr = {x: 0, y: 0};
addEventListener('pointermove', e => { ptr.x = e.clientX / innerWidth * 2 - 1; ptr.y = e.clientY / innerHeight * 2 - 1; });
const clock = new THREE.Clock();
function frame(){
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;
  flash = Math.max(0, flash - dt * (flashBig ? .55 : 1.4));
  pose += ((flash > .05 ? 1 : 0) - pose) * Math.min(1, dt * 8);

  J.rotation.y = Math.sin(t * .5) * .25 + ptr.x * .25;
  J.rotation.z = Math.sin(t * 1.1) * .025;
  J.position.y = Math.abs(Math.sin(t * 2.2)) * .03;
  torso.scale.y = 1 + Math.sin(t * 2.2) * .012;
  head.rotation.y = (Math.sin(t * .8) * .35 + ptr.x * .3) * (1 - pose);
  head.rotation.x = Math.sin(t * 1.3) * .05 + ptr.y * .12 - pose * .1;
  head.rotation.z = Math.sin(t * .9) * .06;
  // during a glint Jacques pushes his glasses up with his right hand
  arms[0].rotation.z = -.12 - Math.sin(t * 1.6) * .05;
  arms[1].rotation.z = .12 + Math.sin(t * 1.6 + 1) * .05 + pose * 2.35;
  arms[1].rotation.x = -pose * .6;
  arms[0].rotation.x = Math.sin(t * 1.6) * .08;

  const tw = .32 + Math.max(0, Math.sin(t * 3.1)) ** 8 * .55;
  glares.forEach((g, i) => { const s = tw * (i ? 1 : .85) + flash * (flashBig ? 9 : 3.5); g.scale.set(s, s, 1); g.material.rotation = t * .4 + i; });

  for(const m of mounts.slice()){
    if(!m.el.isConnected){ unmount(m); continue; }
    if(m.w && m.h) m.renderer.render(scene, m.cam);
  }
}
frame();

window.Jacques3D = {flash(big){ flash = 1; flashBig = !!big; }};
