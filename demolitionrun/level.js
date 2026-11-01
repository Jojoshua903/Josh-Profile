import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { MAP, S, WH, ROWS, COLS, BARRELS, TARGET_NAMES, W, makeTex, grain, stripes } from './core.js';
import { wallMats } from './decor.js';

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const lam = (o) => new THREE.MeshLambertMaterial(o);

// ---------- textures ----------
const wallTex = makeTex((g, w, h) => {
  grain(g, w, h, '#e4dac4', .05, 5000);
  g.fillStyle = '#7d8160'; g.fillRect(0, h * .62, w, h * .38);
  g.fillStyle = 'rgba(0,0,0,.06)'; for (let i = 0; i < 4000; i++) g.fillRect(Math.random() * w, h * .62 + Math.random() * h * .38, 2, 2);
  g.fillStyle = '#9e2b25'; g.fillRect(0, h * .6, w, 6);
  g.strokeStyle = 'rgba(60,45,25,.18)'; g.lineWidth = 2; g.beginPath(); g.moveTo(1, 0); g.lineTo(1, h); g.moveTo(0, h * .3); g.lineTo(w, h * .3); g.stroke();
  g.fillStyle = 'rgba(40,30,20,.08)'; for (let i = 0; i < 4; i++) g.fillRect(Math.random() * w, h * .62, 6 + Math.random() * 8, h * .38);
});
const floorTex = makeTex((g, w, h) => {
  grain(g, w, h, '#cdc4ae', .06, 7000);
  g.strokeStyle = 'rgba(70,60,40,.25)'; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2); g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
  g.fillStyle = 'rgba(60,50,30,.07)'; for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 26, 12, Math.random() * 3, 0, 7); g.fill(); }
}, 256, 256, COLS, ROWS);
const crateTex = makeTex((g, w, h) => {
  grain(g, w, h, '#77794c', .1, 4000);
  g.strokeStyle = '#4b4d2e'; g.lineWidth = 14; g.strokeRect(7, 7, w - 14, h - 14);
  g.lineWidth = 10; g.beginPath(); g.moveTo(10, 10); g.lineTo(w - 10, h - 10); g.stroke();
  g.fillStyle = 'rgba(247,240,225,.8)'; g.font = 'bold 40px Impact'; g.textAlign = 'center'; g.fillText('CW-07', w / 2, h / 2 + 50);
});
const gateTex = makeTex((g, w, h) => { stripes(g, 0, 0, w, h, '#f2b51c', '#1d1b16', 20); g.fillStyle = 'rgba(0,0,0,.25)'; for (let y = 0; y < h; y += 32) g.fillRect(0, y, w, 4); });
const exfilTex = makeTex((g, w, h) => {
  g.fillStyle = '#d7c398'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#2f8f4e'; g.lineWidth = 18; g.beginPath(); g.arc(w / 2, h / 2, w * .38, 0, 7); g.stroke();
  g.fillStyle = '#2f8f4e'; g.font = '150px Impact'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('X', w / 2, h / 2 + 6);
}, 256, 256);
const barrelTex = makeTex((g, w, h) => {
  grain(g, w, h, '#c4321c', .1, 3000);
  g.fillStyle = '#8a2010'; g.fillRect(0, h * .22, w, 10); g.fillRect(0, h * .74, w, 10);
  g.fillStyle = '#f2b51c'; g.beginPath(); g.moveTo(w / 2, h * .36); g.lineTo(w / 2 + 34, h * .64); g.lineTo(w / 2 - 34, h * .64); g.fill();
  g.fillStyle = '#1d1b16'; g.font = 'bold 34px Impact'; g.textAlign = 'center'; g.fillText('!', w / 2, h * .62);
});
const healthTex = makeTex((g, w, h) => { g.fillStyle = '#f7f0e1'; g.fillRect(0, 0, w, h); g.fillStyle = '#d2391b'; g.fillRect(w * .4, h * .18, w * .2, h * .64); g.fillRect(w * .18, h * .4, w * .64, h * .2); }, 64, 64);
function targetTex(name) {
  return makeTex((g, w, h) => {
    grain(g, w, h, '#5b5f3a', .1, 4000);
    stripes(g, 0, 0, w, 44); stripes(g, 0, h - 30, w, 30);
    g.fillStyle = '#f7f0e1'; g.font = '34px Impact'; g.textAlign = 'center'; g.fillText(name, w / 2, h / 2 + 18);
    g.strokeStyle = 'rgba(247,240,225,.5)'; g.lineWidth = 3; g.strokeRect(24, 70, w - 48, h - 120);
  }, 256, 256);
}
export const exclTex = makeTex((g, w, h) => {
  g.fillStyle = '#d2391b'; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 4, 0, 7); g.fill();
  g.strokeStyle = '#1d1b16'; g.lineWidth = 6; g.stroke();
  g.fillStyle = '#f7f0e1'; g.font = '80px Impact'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('!', w / 2, h / 2 + 4);
}, 128, 128);

export const qTex = makeTex((g, w, h) => {
  g.fillStyle = '#f2b51c'; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 4, 0, 7); g.fill();
  g.strokeStyle = '#1d1b16'; g.lineWidth = 6; g.stroke();
  g.fillStyle = '#1d1b16'; g.font = '80px Impact'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', w / 2, h / 2 + 4);
}, 128, 128);

export const MAT = {
  wall: lam({ map: wallTex }), floor: lam({ map: floorTex }), crate: lam({ map: crateTex }),
  gate: lam({ map: gateTex }), exfil: lam({ map: exfilTex }), barrel: lam({ map: barrelTex }),
  ammo: lam({ color: 0x4f6b3a }), health: lam({ map: healthTex }), charge: lam({ color: 0xd2391b, emissive: 0x3a0a00 }),
  uni: lam({ color: 0x9e2b25 }), pants: lam({ color: 0x3f4232 }), skin: lam({ color: 0xc99a6e }),
  helm: lam({ color: 0x2a2a28 }), dark: lam({ color: 0x1d1b16 }), metal: lam({ color: 0x55574a }),
  c4: lam({ color: 0xe8dcc0 }), led: new THREE.MeshBasicMaterial({ color: 0xff2a10 }),
  flash: new THREE.MeshBasicMaterial({ color: 0xffd36b }),
};

// ---------- builders ----------
export function makeEnemy(L, x, z, alert = false, opts = {}) {
  const g = new THREE.Group(); g.rotation.order = 'YXZ';
  const uni = MAT.uni.clone(); if (opts.boss) uni.color.setHex(0x2b2a27);
  const parts = [];
  const add = (geo, mat, px, py, pz, parent = g, head = false) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.castShadow = true; parent.add(m); parts.push(m); m.userData.head = head; return m;
  };
  const legL = new THREE.Group(), legR = new THREE.Group();
  legL.position.set(-.17, .8, 0); legR.position.set(.17, .8, 0); g.add(legL, legR);
  add(box(.26, .8, .3), MAT.pants, 0, -.4, 0, legL); add(box(.26, .8, .3), MAT.pants, 0, -.4, 0, legR);
  add(box(.72, .78, .42), uni, 0, 1.18, 0);
  add(box(.74, .1, .44), MAT.dark, 0, .86, 0);
  add(box(.36, .36, .36), MAT.skin, 0, 1.76, 0, g, true);
  add(box(.44, .17, .46), opts.boss ? MAT.uni : MAT.helm, 0, 1.97, 0, g, true);
  add(box(.38, .07, .02), MAT.dark, 0, 1.79, .19, g, true);
  add(box(.18, .18, .55), uni, .3, 1.28, .2); add(box(.18, .18, .45), uni, -.3, 1.28, .25);
  add(box(.09, .13, .75), MAT.dark, .14, 1.32, .55);
  if (opts.boss) { add(box(.9, .14, .5), MAT.uni, 0, 1.6, 0); add(box(.76, .5, .46), MAT.metal, 0, 1.2, 0); g.scale.setScalar(1.12); }
  // Choirguard: Watch soldiers the bell has half turned to glass. Grand Marshal Ashe wears a whole glass arm.
  const glass = (opts.glass || opts.marshal) ? new THREE.MeshLambertMaterial({ color: 0xcdf1f6, emissive: 0x1a4e5a, transparent: true, opacity: .75 }) : null;
  if (glass) {
    const spike = new THREE.OctahedronGeometry(.16, 0);
    for (const [px, py, pz, sy] of [[-.4, 1.62, 0, 2.4], [-.32, 1.75, -.1, 1.8], [.05, 2.12, -.12, 2.2], [-.18, 1.3, -.22, 1.6]]) { const s = add(spike, glass, px, py, pz); s.scale.y = sy; }
    if (opts.marshal) { add(box(.24, .24, .6), glass, -.32, 1.25, .22); add(new THREE.OctahedronGeometry(.3, 0), glass, -.32, 1.3, .62).scale.set(1, 1, 2); uni.color.setHex(0xe8e2d4); }
    else uni.color.setHex(0x8e3a34);
  }
  if (opts.monk) uni.color.setHex(0xf4ece0); // Order sentries in white robes, practice darts only
  const flash = new THREE.Mesh(box(.18, .18, .18), MAT.flash); flash.position.set(.14, 1.34, .98); flash.visible = false; g.add(flash);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: exclTex, fog: false })); sprite.scale.set(.5, .5, .5); sprite.position.y = 2.45; sprite.visible = false; g.add(sprite);
  g.position.set(x, 0, z); L.group.add(g);
  const hp = opts.marshal ? 520 : opts.boss ? 260 : opts.glass ? 140 : 100;
  const e = {
    g, parts, uni, legL, legR, flash, sprite, x, z, home: [x, z], hp, maxHp: hp, alive: true, deadT: 0,
    kind: opts.marshal ? 'marshal' : opts.boss ? 'commander' : 'soldier', boss: !!opts.boss, name: opts.name, sus: 0, glassGuard: !!glass, glassMat: glass,
    state: 'patrol', yaw: Math.random() * 6.28, yawT: 0, path: null, pathT: 0, pathGoal: -1, pgoal: null, idle: Math.random() * 2,
    lx: x, lz: z, lost: 0, reaction: 0, fireT: 0, senseT: Math.random() * .2, canSee: false, alertFlash: 0, hurtT: 0, walk: 0, seed: Math.random() * 10, flashT: 0,
  };
  e.yawT = e.yaw;
  parts.forEach(m => m.userData.enemy = e);
  L.hitList.push(...parts); L.enemies.push(e);
  if (alert) { e.state = 'alert'; e.reaction = 1; e.alertFlash = 1.5; }
  return e;
}

function makeTarget(L, c, r, idx) {
  const x = c * S + S / 2, z = r * S + S / 2, name = TARGET_NAMES[idx];
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const mat = lam({ map: targetTex(name) });
  const base = new THREE.Mesh(box(2.8, 2, 2.8), mat); base.position.y = 1; base.castShadow = base.receiveShadow = true; g.add(base); L.statics.push(base);
  if (idx === 0) { // comms array mast
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(.08, .12, 5, 6), MAT.metal); mast.position.y = 4.5; g.add(mast);
    const dish = new THREE.Mesh(new THREE.SphereGeometry(.9, 16, 8, 0, 6.3, 0, 1.1), lam({ color: 0xe8dcc0, side: THREE.DoubleSide })); dish.position.set(0, 3.4, .3); dish.rotation.x = -1.1; g.add(dish);
    const tip = new THREE.Mesh(box(.2, .2, .2), MAT.led); tip.position.y = 7; g.add(tip);
  } else if (idx === 1) { // fuel tank
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 2.6, 18), lam({ color: 0xc8b98f })); tank.rotation.z = Math.PI / 2; tank.position.y = 2.9; tank.castShadow = true; g.add(tank);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1.03, 1.03, .3, 18), MAT.uni); band.rotation.z = Math.PI / 2; band.position.y = 2.9; g.add(band);
  } else { // generator
    const top = new THREE.Mesh(box(2, .8, 1.6), MAT.metal); top.position.y = 2.4; top.castShadow = true; g.add(top);
    for (let i = 0; i < 2; i++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, 1.2, 8), MAT.dark); p.position.set(-.5 + i, 3.3, 0); g.add(p); }
  }
  L.group.add(g);
  L.targets.push({ idx, name, x, z, c, r, planted: false, g, base, led: null });
}

const keyTex = makeTex((g, w, h) => { g.fillStyle = '#f2b51c'; g.fillRect(0, 0, w, h); g.fillStyle = '#1d1b16'; g.fillRect(8, 10, 24, 20); g.font = 'bold 18px Impact'; g.fillText('VOSS', 40, 28); g.fillRect(0, h - 14, w, 6); }, 128, 64);
const intelTex = makeTex((g, w, h) => { g.fillStyle = '#9e2b25'; g.fillRect(0, 0, w, h); g.fillStyle = '#f7f0e1'; g.fillRect(10, 14, w - 20, 10); g.font = 'bold 16px Impact'; g.fillText('SECRET', 14, 50); }, 64, 64);
const lockTex = makeTex((g, w, h) => { grain(g, w, h, '#55574a', .1, 3000); stripes(g, 0, h - 40, w, 40, '#d2391b', '#1d1b16', 18); g.fillStyle = '#f7f0e1'; g.font = '30px Impact'; g.textAlign = 'center'; g.fillText('ARMORY', w / 2, 90); g.font = '18px Impact'; g.fillText('AUTHORISED ONLY', w / 2, 120); g.fillStyle = '#d2391b'; g.fillRect(w / 2 - 20, 150, 40, 26); }, 256, 256);
const sealTex = makeTex((g, w, h) => { grain(g, w, h, '#ddd3c0', .06, 4000); g.strokeStyle = '#b89448'; g.lineWidth = 6; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(w / 2, h / 2, 30 + i * 28, 0, 7); g.stroke(); } g.fillStyle = '#2a9d9a'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(w / 2 - 50 + i * 50, h / 2 + 100, 6 + i * 4, 0, 7); g.fill(); } }, 256, 256);

const shojiTex = makeTex((g, w, h) => { g.fillStyle = '#f7f0e1'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1d1b16'; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10); g.lineWidth = 4; for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(i * w / 4, 0); g.lineTo(i * w / 4, h); g.stroke(); g.beginPath(); g.moveTo(0, i * h / 4); g.lineTo(w, i * h / 4); g.stroke(); } g.fillStyle = '#c8321e'; g.beginPath(); g.arc(w / 2, h / 2, 26, 0, 7); g.fill(); }, 256, 256);
const letterPickTex = makeTex((g, w, h) => { g.fillStyle = '#f7f0e1'; g.fillRect(0, 0, w, h); g.fillStyle = '#1d1b16'; for (let i = 0; i < 5; i++) g.fillRect(10 + i * 10, 8, 4, 30 + Math.random() * 16); g.fillStyle = '#c8321e'; g.fillRect(w - 18, h - 18, 12, 12); }, 64, 64);

export function makePickup(L, type, x, z, style = 1) {
  const g = new THREE.Group(); g.position.set(x, .6, z);
  const P = (geo, mat, px = 0, py = 0, pz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.castShadow = true; g.add(m); return m; };
  if (type === 'A') { P(box(.6, .35, .4), MAT.ammo); P(box(.62, .08, .42), lam({ color: 0xf2b51c }), 0, .08); }
  else if (type === 'H') P(box(.5, .5, .5), MAT.health);
  else if (type === 'C') P(box(.5, .3, .3), MAT.charge);
  else if (type === 'S') { P(box(.12, .14, 1.1), MAT.dark); P(box(.13, .16, .35), lam({ color: 0x8a6a42 }), 0, -.04, .5); P(box(.14, .1, .3), lam({ color: 0xd2391b }), 0, -.08, -.2); }
  else if (type === 'R') { P(box(.6, .7, .25), lam({ color: 0x4f5a66 })); P(box(.5, .2, .27), lam({ color: 0xf2b51c }), 0, .15); }
  else if (type === 'Y') P(box(.45, .02, .28), lam({ map: keyTex, emissive: 0x3a2a00 }));
  else if (type === 'V') { const t = P(new THREE.TorusGeometry(.3, .06, 8, 24), lam({ color: 0xf2b51c, emissive: 0x6a4500 })); P(new THREE.OctahedronGeometry(.14, 0), new THREE.MeshBasicMaterial({ color: 0x7ff7ee })); t.rotation.x = .4; }
  else if (type === 'M') { const b = P(box(.05, .06, 1.3), lam({ color: 0xe8e4da, emissive: 0x222018 })); b.rotation.x = .3; const hilt = P(box(.07, .07, .32), lam({ color: 0xc8321e }), 0, -.2, .7); hilt.rotation.x = .3; P(box(.22, .04, .05), MAT.dark, 0, -.13, .5); }
  else if (type === 'I') {
    if (style === 3) P(box(.42, .03, .55), lam({ map: letterPickTex, emissive: 0x202020 })).rotation.z = .2;
    else if (style === 2) P(new THREE.OctahedronGeometry(.25, 0), lam({ color: 0xffe08a, emissive: 0x7a5200, transparent: true, opacity: .9 })).scale.y = 1.8;
    else P(box(.4, .05, .5), lam({ map: intelTex }));
  }
  L.group.add(g);
  L.pickups.push({ type, mesh: g, x, z, taken: false, ph: Math.random() * 6 });
}

// security camera that sweeps a cone of light (level 1)
export function makeCamera(L, c, r, yaw) {
  const x = c * S + S / 2, z = r * S + S / 2, g = new THREE.Group(); g.position.set(x, WH - .4, z);
  const head = new THREE.Group(); g.add(head);
  const bodyM = new THREE.Mesh(box(.3, .25, .5), MAT.metal); bodyM.position.z = .15; head.add(bodyM);
  const lens = new THREE.Mesh(box(.16, .16, .05), MAT.led); lens.position.z = .42; head.add(lens);
  const coneMat = new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: .14, depthWrite: false, side: THREE.DoubleSide });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(3.4, 11, 20, 1, true), coneMat); cone.rotation.x = -Math.PI / 2 - .32; cone.position.set(0, -1.8, 5.4); head.add(cone);
  const mount = new THREE.Mesh(box(.1, .4, .1), MAT.dark); mount.position.y = .25; g.add(mount);
  L.group.add(g); bodyM.userData.cam = lens.userData.cam = null;
  const cam = { g, head, cone, coneMat, x, z, base: yaw, yaw, alive: true, sus: 0, cool: 0, ph: Math.random() * 6 };
  bodyM.userData.cam = cam; lens.userData.cam = cam; L.hitList.push(bodyM, lens); L.cameras.push(cam);
}

export function buildLevel(scene, def, withCrash = true) {
  const L = { group: new THREE.Group(), statics: [], hitList: [], enemies: [], targets: [], pickups: [], barrels: [], gateMeshes: [], lockMeshes: [], cameras: [], start: { x: 6, z: 6 } };
  scene.add(L.group);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(COLS * S, ROWS * S), def.floorMat || MAT.floor);
  floor.rotation.x = -Math.PI / 2; floor.position.set(COLS * S / 2, 0, ROWS * S / 2); floor.receiveShadow = true;
  L.group.add(floor); L.statics.push(floor);
  const wallGeo = box(S, WH + .3, S), wallMat = def.wallMats || wallMats(MAT.wall), crateA = box(2.8, 1.4, 2.8), crateB = box(2.2, 1.2, 2.2);
  let tIdx = 0, dIdx = 0;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const ch = MAP[r][c], cx = c * S + S / 2, cz = r * S + S / 2;
    if (ch === '#') {
      // skip walls fully enclosed by walls
      const open = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dc, dr]) => { const n = (MAP[r + dr] || '')[c + dc]; return n && n !== '#'; });
      if (!open) continue;
      const m = new THREE.Mesh(wallGeo, wallMat); m.position.set(cx, (WH + .3) / 2, cz); m.castShadow = m.receiveShadow = true; L.group.add(m); L.statics.push(m);
    } else if (ch === 'B') {
      if (def.customCrates) continue;
      const a = new THREE.Mesh(crateA, MAT.crate); a.position.set(cx, .7, cz); a.castShadow = a.receiveShadow = true;
      const b = new THREE.Mesh(crateB, MAT.crate); b.position.set(cx + .1, 2, cz - .1); b.rotation.y = .25; b.castShadow = true;
      L.group.add(a, b); L.statics.push(a, b);
    } else if (ch === 'T') (def.makeTarget || makeTarget)(L, c, r, tIdx++);
    else if (ch === 'D') {
      if (def.makeGate) { def.makeGate(L, cx, cz, dIdx++); continue; }
      const m = new THREE.Mesh(box(S, WH, .6), MAT.gate); m.position.set(cx, WH / 2, cz); m.castShadow = true; L.group.add(m); L.statics.push(m); L.gateMeshes.push(m);
    } else if (ch === 'X') {
      if (def.customExit) continue;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(S, S), MAT.exfil); m.rotation.x = -Math.PI / 2; m.position.set(cx, .02, cz); L.group.add(m);
    } else if (ch === 'E') makeEnemy(L, cx, cz, false, def.enemyOpts);
    else if (ch === 'g') makeEnemy(L, cx, cz, false, { glass: true });
    else if (ch === 'G') makeHollow(L, cx, cz);
    else if (ch === 'O') makeEnemy(L, cx, cz, false, { boss: true, name: def.bossName });
    else if (ch === 'W') makeHollow(L, cx, cz, false, { boss: true, name: def.bossName });
    else if (ch === 'N') makeShade(L, cx, cz);
    else if (ch === 'U') (def.makeBoss || makeHeart)(L, cx, cz, def.bossName);
    else if (ch === 'L') {
      const ns = '#'.includes((MAP[r] || '')[c - 1] || '#'); // walls left/right → door spans east-west
      const tex = def.lockStyle === 'stone' ? sealTex : def.lockStyle === 'paper' ? shojiTex : lockTex;
      const m = new THREE.Mesh(box(ns ? S : .5, WH, ns ? .5 : S), lam({ map: tex }));
      m.position.set(cx, WH / 2, cz); m.castShadow = true; L.group.add(m); L.statics.push(m); L.lockMeshes.push(m);
    }
    else if (ch === 'P') L.start = { x: cx, z: cz };
    else if ('HACSRIVM'.includes(ch)) makePickup(L, ch, cx, cz, def.id);
  }
  for (const [c, r, yaw] of def.cameras || []) makeCamera(L, c, r, yaw);
  const bGeo = new THREE.CylinderGeometry(.5, .5, 1.3, 14);
  for (const [c, r] of BARRELS) {
    const b = { x: c * S + S / 2 + (Math.random() - .5), z: r * S + S / 2 + (Math.random() - .5), r: .55, dead: false, fuse: -1 };
    const m = new THREE.Mesh(bGeo, MAT.barrel); m.position.set(b.x, .65, b.z); m.castShadow = true; m.userData.barrel = b; b.mesh = m;
    L.group.add(m); L.hitList.push(m); L.barrels.push(b); W.obstacles.push(b);
  }
  // exfil green flare light
  if (!def.customExit) { const gl = new THREE.PointLight(0x3cff7a, 30, 14, 1.5); gl.position.set(11 * S, 2, 19 * S + 2); L.group.add(gl); }
  def.decorate(L, withCrash);
  return L;
}

// glass guardians of the vault: float instead of walk, throw crystal shards, blink when hurt
const hollowGeo = { torso: new THREE.OctahedronGeometry(.55, 0), shard: new THREE.OctahedronGeometry(.18, 0), head: new THREE.IcosahedronGeometry(.24, 0) };
export function makeHollow(L, x, z, alert = false, opts = {}) {
  const g = new THREE.Group(); g.rotation.order = 'YXZ';
  const glass = new THREE.MeshLambertMaterial({ color: 0xc8f4f2, emissive: 0x1a5e66, transparent: true, opacity: .55, depthWrite: false });
  const core = new THREE.MeshBasicMaterial({ color: 0xf2b51c });
  const parts = [];
  const add = (geo, mat, px, py, pz, sx = 1, sy = 1, sz = 1, head = false) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.scale.set(sx, sy, sz); g.add(m); parts.push(m); m.userData.head = head; return m; };
  add(hollowGeo.torso, glass, 0, 1.15, 0, .9, 1.6, .7);
  add(hollowGeo.shard, glass, -.5, 1.45, .05, 1, 2.6, 1).rotation.z = .5;
  add(hollowGeo.shard, glass, .5, 1.45, .05, 1, 2.6, 1).rotation.z = -.5;
  add(hollowGeo.shard, glass, 0, .35, 0, 1.4, 2.4, 1.4);
  const head = add(hollowGeo.head, glass, 0, 2.05, 0, 1, 1.2, 1, true);
  const gem = new THREE.Mesh(hollowGeo.shard, core); gem.scale.setScalar(.7); head.add(gem); gem.userData.head = true; parts.push(gem);
  const legL = new THREE.Group(), legR = new THREE.Group(); g.add(legL, legR);
  const flash = new THREE.Mesh(hollowGeo.shard, new THREE.MeshBasicMaterial({ color: 0x7ff7ee })); flash.position.set(.5, 1.6, .5); flash.visible = false; g.add(flash);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: exclTex, fog: false })); sprite.scale.set(.5, .5, .5); sprite.position.y = 2.7; sprite.visible = false; g.add(sprite);
  g.position.set(x, 0, z); L.group.add(g);
  if (opts.boss) { g.scale.setScalar(1.7); glass.color.setHex(0xe8d8ff); glass.emissive.setHex(0x40306a); }
  const e = {
    kind: 'hollow', baseEm: opts.boss ? 0x40306a : 0x1a5e66, boss: !!opts.boss, name: opts.name, sus: 0, g, parts, uni: glass, glass, legL, legR, flash, sprite, gem, x, z, home: [x, z],
    hp: opts.boss ? 480 : 90, maxHp: opts.boss ? 480 : 90, alive: true, deadT: 0,
    state: 'patrol', yaw: Math.random() * 6.28, yawT: 0, path: null, pathT: 0, pathGoal: -1, pgoal: null, idle: Math.random() * 2,
    lx: x, lz: z, lost: 0, reaction: 0, fireT: 0, senseT: Math.random() * .2, canSee: false, alertFlash: 0, hurtT: 0, walk: 0, seed: Math.random() * 10, flashT: 0,
  };
  e.yawT = e.yaw;
  parts.forEach(m => m.userData.enemy = e);
  L.hitList.push(...parts); L.enemies.push(e);
  if (alert) { e.state = 'alert'; e.reaction = 1.2; e.alertFlash = 1.5; }
  return e;
}

export function enemyRecord(L, fields, parts) {
  const e = {
    sus: 0, alive: true, deadT: 0, state: 'patrol', yaw: Math.random() * 6.28, yawT: 0, path: null, pathT: 0, pathGoal: -1, pgoal: null, idle: Math.random() * 2,
    lost: 0, reaction: 0, fireT: 0, senseT: Math.random() * .2, canSee: false, alertFlash: 0, hurtT: 0, walk: 0, seed: Math.random() * 10, flashT: 0, ...fields,
  };
  e.lx = e.x; e.lz = e.z; e.home = [e.x, e.z]; e.yawT = e.yaw;
  parts.forEach(m => m.userData.enemy = e);
  L.hitList.push(...parts); L.enemies.push(e);
  return e;
}

// The Unending Hand: Ashe's glass arm, which kept singing after she died and grew on shards of the bell
export function makeHand(L, x, z, name) {
  const g = new THREE.Group(); g.position.set(x, 2.6, z);
  const glass = new THREE.MeshLambertMaterial({ color: 0xd6f3f8, emissive: 0x1a4e5a, transparent: true, opacity: .78 });
  const gold = new THREE.MeshBasicMaterial({ color: 0xf2b51c });
  const palm = new THREE.Mesh(box(1.9, .55, 2.1), glass); palm.castShadow = true; g.add(palm);
  const wrist = new THREE.Mesh(new THREE.CylinderGeometry(.55, .7, 1.4, 8), glass); wrist.rotation.x = Math.PI / 2; wrist.position.z = -1.6; g.add(wrist);
  const fingers = [];
  for (let i = 0; i < 5; i++) {
    const thumb = i === 4, f = new THREE.Group();
    f.position.set(thumb ? -1.05 : -.72 + i * .48, 0, thumb ? -.1 : 1.05); f.rotation.y = thumb ? -.9 : 0; g.add(f);
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(.17, .2, 1.2, 6), glass); seg.rotation.x = Math.PI / 2; seg.position.z = .6; seg.castShadow = true; f.add(seg);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(.17, .6, 6), glass); tip.rotation.x = Math.PI / 2; tip.position.z = 1.45; f.add(tip);
    fingers.push(f);
  }
  const eye = new THREE.Mesh(new THREE.OctahedronGeometry(.42, 0), gold); eye.position.y = .4; eye.userData.head = true; g.add(eye);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.3, .08, 6, 20), gold); ring.position.set(-.72 + .48, 0, 1.3); ring.rotation.x = Math.PI / 2; g.add(ring);
  const orbit = [];
  for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.OctahedronGeometry(.28, 0), glass); s.scale.y = 2.2; g.add(s); orbit.push(s); }
  const flash = new THREE.Mesh(box(.1, .1, .1), MAT.flash); flash.visible = false; g.add(flash);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: exclTex, fog: false })); sprite.visible = false; g.add(sprite);
  const light = new THREE.PointLight(0x9feef4, 22, 16, 1.4); g.add(light);
  L.group.add(g);
  const parts = [palm, wrist, eye, ...fingers.flatMap(f => f.children)];
  return enemyRecord(L, { kind: 'hand', boss: true, name, g, parts, uni: glass, glass, fingers, eye, orbit, light, legL: new THREE.Group(), legR: new THREE.Group(), flash, sprite, x, z, hp: 1000, maxHp: 1000, baseEm: 0x1a4e5a,
    hover: 2.6, clench: 0, slam: null, slamCd: 3, fireT: 2, spawnT: 14, stunT: 0 }, parts);
}

// Shades: ink-brushed memories of the Order's own shinobi. Fast, silent, they cut instead of shoot.
export function makeShade(L, x, z, alert = false) {
  const g = new THREE.Group(); g.rotation.order = 'YXZ';
  const ink = new THREE.MeshLambertMaterial({ color: 0x1d1b16, transparent: true, opacity: .92 });
  const scarf = new THREE.MeshLambertMaterial({ color: 0xc8321e, side: THREE.DoubleSide });
  const parts = [];
  const add = (geo, mat, px, py, pz, parent = g, head = false) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.castShadow = true; parent.add(m); parts.push(m); m.userData.head = head; return m; };
  const legL = new THREE.Group(), legR = new THREE.Group(); legL.position.set(-.13, .85, 0); legR.position.set(.13, .85, 0); g.add(legL, legR);
  add(box(.18, .85, .2), ink, 0, -.42, 0, legL); add(box(.18, .85, .2), ink, 0, -.42, 0, legR);
  add(box(.5, .8, .3), ink, 0, 1.25, 0); add(new THREE.SphereGeometry(.2, 10, 8), ink, 0, 1.85, 0, g, true);
  const band = new THREE.Mesh(box(.42, .07, .42), scarf); band.position.y = 1.88; g.add(band);
  const tail = new THREE.Mesh(new THREE.PlaneGeometry(.18, .9), scarf); tail.position.set(0, 1.6, -.3); tail.rotation.x = .7; g.add(tail);
  const blade = new THREE.Mesh(box(.04, .04, .9), new THREE.MeshLambertMaterial({ color: 0xe8e4da })); blade.position.set(.3, 1.1, .4); blade.rotation.x = -.6; g.add(blade);
  const flash = new THREE.Mesh(box(.1, .1, .1), MAT.flash); flash.visible = false; g.add(flash);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: exclTex, fog: false })); sprite.scale.set(.5, .5, .5); sprite.position.y = 2.4; sprite.visible = false; g.add(sprite);
  g.position.set(x, 0, z); L.group.add(g);
  const e = enemyRecord(L, { kind: 'shade', g, parts, uni: ink, ink, legL, legR, flash, sprite, tail, blade, x, z, hp: 60, maxHp: 60, speed: 1.55 }, parts);
  if (alert) { e.state = 'alert'; e.reaction = .3; e.alertFlash = 1.2; }
  return e;
}

// The First Note: the heart of the Choir, hanging inside Reshman's memory
export function makeHeart(L, x, z, name) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const glass = new THREE.MeshLambertMaterial({ color: 0xf4f0ff, emissive: 0x3a2a5a, transparent: true, opacity: .7 });
  const core = new THREE.MeshBasicMaterial({ color: 0xf2b51c });
  const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4, 0), glass); shell.position.y = 3; g.add(shell);
  const heart = new THREE.Mesh(new THREE.OctahedronGeometry(.55, 0), core); heart.position.y = 3; heart.userData.head = true; g.add(heart);
  const rings = [0, 1, 2].map(i => { const r = new THREE.Mesh(new THREE.TorusGeometry(2 + i * .5, .05, 6, 48), new THREE.MeshLambertMaterial({ color: 0x1d1b16 })); r.position.y = 3; g.add(r); return r; });
  const shards = [];
  for (let i = 0; i < 8; i++) { const s = new THREE.Mesh(new THREE.OctahedronGeometry(.3, 0), glass); s.scale.y = 2.5; g.add(s); shards.push(s); }
  const flash = new THREE.Mesh(box(.1, .1, .1), MAT.flash); flash.visible = false; g.add(flash);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: exclTex, fog: false })); sprite.visible = false; g.add(sprite);
  const light = new THREE.PointLight(0xd8c8ff, 30, 20, 1.4); light.position.y = 3; g.add(light);
  L.group.add(g);
  const parts = [shell, heart, ...shards];
  return enemyRecord(L, { kind: 'heart', boss: true, name, g, parts, uni: glass, glass, shell, heart, rings, shards, light, legL: new THREE.Group(), legR: new THREE.Group(), flash, sprite, x, z, hp: 1100, maxHp: 1100, baseEm: 0x3a2a5a, pulseT: 6, spawnT: 10 }, parts);
}
