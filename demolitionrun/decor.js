import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { MAP, S, WH, ROWS, COLS, BARRELS, W, makeTex, grain, stripes } from './core.js';

// Interior dressing: roofs, ceilings, lights, door frames, props, posters, crash site and the desert outside.
export const YARD_ROW = 16;          // rows from here south are the open-air motor pool
export const HOLE = [2, 2];          // where the chopper punched through the storage bay roof
const ch = (c, r) => (MAP[r] || '')[c] || '#';
const open = (c, r) => !'#BTD'.includes(ch(c, r));
export const indoor = (c, r) => r < YARD_ROW && !(c === HOLE[0] && r === HOLE[1]);
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const lam = o => new THREE.MeshLambertMaterial(o), basic = o => new THREE.MeshBasicMaterial(o);
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

// ---------- textures ----------
export const roofTex = makeTex((g, w, h) => { grain(g, w, h, '#b9b2a2', .09, 6000); g.strokeStyle = 'rgba(40,35,25,.35)'; g.lineWidth = 3; g.strokeRect(0, 0, w, h); });
const ceilTex = makeTex((g, w, h) => { grain(g, w, h, '#ece6d6', .04, 2000); g.strokeStyle = 'rgba(80,70,50,.3)'; g.lineWidth = 4; for (let i = 0; i <= 2; i++) { g.beginPath(); g.moveTo(i * w / 2, 0); g.lineTo(i * w / 2, h); g.stroke(); g.beginPath(); g.moveTo(0, i * h / 2); g.lineTo(w, i * h / 2); g.stroke(); } });
const sandTex = makeTex((g, w, h) => { grain(g, w, h, '#e0c896', .07, 8000); g.fillStyle = 'rgba(150,110,60,.08)'; for (let i = 0; i < 8; i++) { g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 40, 8, .2, 0, 7); g.fill(); } }, 256, 256);
const posterTex = makeTex((g, w, h) => {
  g.fillStyle = '#f2e8d0'; g.fillRect(0, 0, w, h); g.fillStyle = '#9e2b25'; g.fillRect(0, 0, w, h * .72);
  g.fillStyle = '#f2e8d0'; g.beginPath(); g.ellipse(w / 2, h * .34, w * .34, h * .14, 0, 0, 7); g.fill();
  g.fillStyle = '#1d1b16'; g.beginPath(); g.arc(w / 2, h * .34, w * .12, 0, 7); g.fill();
  g.fillStyle = '#9e2b25'; g.beginPath(); g.arc(w / 2, h * .34, w * .04, 0, 7); g.fill();
  g.fillStyle = '#1d1b16'; g.font = '30px Impact'; g.textAlign = 'center'; g.fillText('THE WATCH', w / 2, h * .82); g.font = '22px Impact'; g.fillText('SEES ALL', w / 2, h * .92);
}, 192, 256);
const notices = ['NO SMOKING NEAR FUEL', 'HELMETS ON', 'REPORT ALL INTRUDERS', 'SHIFT ROSTER', 'LOOSE LIPS SINK BASES'];
const noticeTex = notices.map(t => makeTex((g, w, h) => { g.fillStyle = '#f7f0e1'; g.fillRect(0, 0, w, h); stripes(g, 0, 0, w, 22); g.fillStyle = '#1d1b16'; g.font = 'bold 24px Impact'; g.textAlign = 'center'; t.split(' ').forEach((s, i, a) => g.fillText(s, w / 2, 70 + i * 30 - (a.length - 3) * 10)); for (let i = 0; i < 4; i++) g.fillRect(30, 170 + i * 14, 80 + Math.random() * 60, 5); }, 192, 256));
const screenTex = [0, 1, 2].map(k => makeTex((g, w, h) => {
  g.fillStyle = '#0f2a1a'; g.fillRect(0, 0, w, h); g.fillStyle = k === 2 ? '#ff6b4a' : '#57f28a'; g.font = '14px Menlo, monospace';
  const L = [['IRONVEIL OS 4.1', '> PERIMETER  OK', '> AIR DEF   OFF?', '> SECTOR 3  ---', '> PATROL B  12'], ['FUEL RESERVE', '#########__ 82%', 'PUMP 2  NOMINAL', 'GEN LOAD   61%', 'COMMS UPLINK ON'], ['!! WARNING !!', 'UNSCHEDULED', 'AIR CONTACT', 'SECTOR 1 ROOF', 'STATUS: ???']][k];
  L.forEach((s, i) => g.fillText(s, 10, 24 + i * 20));
}, 160, 120));
const rackTex = makeTex((g, w, h) => { g.fillStyle = '#22231f'; g.fillRect(0, 0, w, h); for (let y = 8; y < h; y += 18) { g.fillStyle = '#34352f'; g.fillRect(6, y, w - 12, 13); g.fillStyle = Math.random() < .5 ? '#57f28a' : '#f2b51c'; g.fillRect(w - 20, y + 4, 5, 5); g.fillStyle = '#57f28a'; g.fillRect(w - 30, y + 4, 5, 5); } }, 64, 256);
const lockerTex = makeTex((g, w, h) => { grain(g, w, h, '#7f8571', .08, 2000); g.strokeStyle = '#4c5043'; g.lineWidth = 4; for (let i = 0; i < 3; i++) { g.strokeRect(4 + i * w / 3, 4, w / 3 - 8, h - 8); for (let v = 0; v < 4; v++) g.fillRect(14 + i * w / 3, 20 + v * 8, w / 3 - 28, 3); } }, 192, 256);
function signTex(t) { return makeTex((g, w, h) => { g.fillStyle = '#1d1b16'; g.fillRect(0, 0, w, h); g.fillStyle = '#f2b51c'; g.font = '34px Impact'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, w / 2, h / 2 + 2); }, 256, 48); }

const M = {
  roof: lam({ map: roofTex }), ceil: lam({ map: ceilTex }), sand: lam({ map: sandTex }),
  fixture: basic({ color: 0xfffbe8 }), metal: lam({ color: 0x6b6d62 }), dark: lam({ color: 0x2b2a27 }), wood: lam({ color: 0x8a6a42 }),
  olive: lam({ color: 0x6f7348 }), cream: lam({ color: 0xe8dcc0 }), red: lam({ color: 0x9e2b25 }), mesa: lam({ color: 0xc98d5e }),
  poster: lam({ map: posterTex }), rack: lam({ map: rackTex }), locker: lam({ map: lockerTex }), char: lam({ color: 0x2a2622 }),
  beacon: lam({ color: 0x7a1d12, emissive: 0x000000 }), frame: lam({ color: 0x5b5f3a }),
};
export const wallMats = (wall) => [wall, wall, M.roof, wall, wall, wall];

// ---------- prop builders (front faces +z) ----------
function piece(g, w, h, d, m, x, y, z, statics) { const k = new THREE.Mesh(box(w, h, d), m); k.position.set(x, y, z); k.castShadow = k.receiveShadow = true; g.add(k); statics && statics.push(k); return k; }
const PROPS = {
  lockers: (g, s) => { piece(g, 2.4, 2.2, .6, [M.metal, M.metal, M.metal, M.metal, M.locker, M.metal], 0, 1.1, 0, s); return [2.4, .6]; },
  desk: (g, s, A) => {
    piece(g, 2, .08, .9, M.wood, 0, .85, 0, s); piece(g, .08, .85, .8, M.dark, -.9, .42, 0); piece(g, .08, .85, .8, M.dark, .9, .42, 0);
    piece(g, .7, .5, .08, M.dark, -.2, 1.2, -.15); const sc = new THREE.Mesh(new THREE.PlaneGeometry(.62, .42), basic({ map: screenTex[Math.floor(rnd() * 3)] })); sc.position.set(-.2, 1.2, -.105); g.add(sc);
    piece(g, .5, .04, .2, M.dark, -.2, .9, .2); piece(g, .5, .5, .5, M.olive, .6, .3, .7); A.screens.push(sc); return [2, .9];
  },
  rack: (g, s, A) => { piece(g, .9, 2.4, .9, [M.dark, M.dark, M.dark, M.dark, M.rack, M.dark], 0, 1.2, 0, s); const led = new THREE.Mesh(box(.06, .06, .02), basic({ color: 0xff3a1a })); led.position.set(.3, 2.2, .46); g.add(led); A.leds.push(led); return [.9, .9]; },
  shelf: (g, s) => {
    for (const x of [-1.1, 1.1]) piece(g, .08, 2.4, .7, M.metal, x, 1.2, 0);
    for (const y of [.3, 1.1, 1.9]) { piece(g, 2.3, .06, .7, M.metal, 0, y, 0, s); for (let i = 0; i < 3; i++) if (rnd() < .7) piece(g, .5 + rnd() * .2, .4 + rnd() * .2, .5, rnd() < .5 ? M.olive : M.wood, -.7 + i * .7, y + .26, 0); }
    return [2.3, .7];
  },
  bunk: (g, s) => { for (const y of [.5, 1.6]) { piece(g, 2.2, .14, .9, M.metal, 0, y, 0, s); piece(g, 2.1, .14, .85, M.cream, 0, y + .14, 0); } for (const x of [-1.05, 1.05]) piece(g, .08, 2, .08, M.metal, x, 1, .4); return [2.2, .9]; },
  cooler: (g, s) => { piece(g, .5, 1.1, .5, M.cream, 0, .55, 0, s); const b = new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, .45, 10), lam({ color: 0x8fc4e0, transparent: true, opacity: .7 })); b.position.y = 1.35; g.add(b); return [.6, .6]; },
  cabinet: (g, s) => { piece(g, .7, 1.4, .7, M.olive, 0, .7, 0, s); for (let i = 0; i < 3; i++) piece(g, .2, .04, .02, M.dark, 0, .35 + i * .42, .36); return [.7, .7]; },
};
const PROP_KEYS = ['lockers', 'desk', 'desk', 'rack', 'shelf', 'bunk', 'cooler', 'cabinet', 'rack', 'shelf'];

export function decorate(L, withCrash = true) {
  seed = 11;
  const A = L.anim = { lights: [], flicker: [], screens: [], leds: [], beacons: [], vents: [], fireBits: [], fireLight: null, wreck: null, dust: null };
  const add = o => (L.group.add(o), o);

  // ceilings (instanced) with a roof on top
  const ceilCells = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (ch(c, r) !== '#' && indoor(c, r)) ceilCells.push([c, r]);
  const ceil = new THREE.InstancedMesh(box(S, .3, S), [M.roof, M.roof, M.roof, M.ceil, M.roof, M.roof], ceilCells.length);
  const mtx = new THREE.Matrix4();
  ceilCells.forEach(([c, r], i) => ceil.setMatrixAt(i, mtx.makeTranslation(c * S + S / 2, WH + .15, r * S + S / 2)));
  ceil.castShadow = ceil.receiveShadow = true; add(ceil); L.statics.push(ceil);

  // light fixtures, with a spaced subset carrying real point lights
  const fixCells = ceilCells.filter(([c, r]) => open(c, r));
  const fix = new THREE.InstancedMesh(box(1.8, .08, .32), M.fixture, fixCells.length);
  const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
  const lit = [];
  fixCells.forEach(([c, r], i) => {
    const ns = !open(c - 1, r) && !open(c + 1, r);
    q.setFromAxisAngle(up, ns ? Math.PI / 2 : 0);
    fix.setMatrixAt(i, mtx.compose(new THREE.Vector3(c * S + S / 2, WH - .04, r * S + S / 2), q, one));
    if (lit.length < 20 && !lit.some(([a, b]) => Math.abs(a - c) < 3 && Math.abs(b - r) < 3)) lit.push([c, r]);
  });
  add(fix);
  lit.forEach(([c, r], i) => {
    const l = new THREE.PointLight(0xfff1d8, 16, 14, 1.5); l.position.set(c * S + S / 2, WH - .5, r * S + S / 2); add(l);
    A.lights.push({ l, base: 16 }); if (i % 7 === 3) A.flicker.push(A.lights[A.lights.length - 1]);
  });

  // open-air motor pool: sand floor over the yard
  const yard = new THREE.Mesh(new THREE.PlaneGeometry(COLS * S, (ROWS - YARD_ROW) * S), M.sand);
  yard.material.map.repeat.set(COLS / 2, (ROWS - YARD_ROW) / 2); yard.rotation.x = -Math.PI / 2; yard.position.set(COLS * S / 2, .01, (YARD_ROW + (ROWS - YARD_ROW) / 2) * S); yard.receiveShadow = true; add(yard);

  // door frames + signs where a one-cell gap joins two spaces
  const roomName = (c, r) => r < 4 && c < 5 ? 'STORAGE BAY 1' : r < 4 && c > 14 ? 'COMMS' : r < 4 ? 'BARRACKS' : r < 10 && c < 8 ? 'FUEL DEPOT' : r > 12 && c > 5 && c < 15 ? 'POWER ROOM' : r >= YARD_ROW ? 'MOTOR POOL' : r > 10 ? 'SECTOR ' + (2 + (c % 3)) : 'ARMORY';
  const doorAt = new Set();
  for (let r = 1; r < ROWS - 1; r++) for (let c = 1; c < COLS - 1; c++) {
    if (!open(c, r) || !indoor(c, r) && r !== YARD_ROW) continue;
    const ew = ch(c - 1, r) === '#' && ch(c + 1, r) === '#' && open(c, r - 1) && open(c, r + 1);
    const ns = ch(c, r - 1) === '#' && ch(c, r + 1) === '#' && open(c - 1, r) && open(c + 1, r);
    if (!ew && !ns) continue;
    doorAt.add(r * COLS + c);
    const g = new THREE.Group(); g.position.set(c * S + S / 2, 0, r * S + S / 2); if (ns) g.rotation.y = Math.PI / 2;
    for (const x of [-1.8, 1.8]) piece(g, .4, WH, .7, M.frame, x, WH / 2, 0);
    piece(g, S, .7, .7, M.frame, 0, WH - .35, 0);
    const th = new THREE.Mesh(new THREE.PlaneGeometry(3.2, .4), lam({ map: makeTex((gg, w, h) => stripes(gg, 0, 0, w, h, '#f2b51c', '#1d1b16', 16), 256, 32) })); th.rotation.x = -Math.PI / 2; th.position.y = .02; g.add(th);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.8, .34), lam({ map: signTex(roomName(c, r + (ew ? 1 : 0))), side: THREE.DoubleSide })); sign.position.set(0, WH - .35, .36); g.add(sign);
    add(g);
  }

  // props against walls
  const barrelCells = new Set(BARRELS.map(([c, r]) => r * COLS + c));
  for (let r = 1; r < YARD_ROW; r++) for (let c = 1; c < COLS - 1; c++) {
    const k = r * COLS + c;
    if (ch(c, r) !== '.' || doorAt.has(k) || barrelCells.has(k) || (c === HOLE[0] && r === HOLE[1])) continue;
    const walls = [[0, -1], [0, 1], [-1, 0], [1, 0]].filter(([dc, dr]) => ch(c + dc, r + dr) === '#');
    if (!walls.length || rnd() > .42) continue;
    const [dc, dr] = walls[Math.floor(rnd() * walls.length)];
    const start = c < 5 && r < 4;
    const type = start ? 'shelf' : PROP_KEYS[Math.floor(rnd() * PROP_KEYS.length)];
    const g = new THREE.Group(); const [pw, pd] = PROPS[type](g, L.statics, A);
    const off = S / 2 - pd / 2 - .05; g.position.set(c * S + S / 2 + dc * off, 0, r * S + S / 2 + dr * off);
    g.rotation.y = Math.atan2(-dc, -dr); add(g);
    const along = [dr !== 0 ? 1 : 0, dc !== 0 ? 1 : 0];
    for (let t = -pw / 2 + pd / 2; t <= pw / 2 - pd / 2 + .01; t += Math.max(.4, pd * .8)) W.obstacles.push({ x: g.position.x + along[0] * t, z: g.position.z + along[1] * t, r: pd / 2 + .05, dead: false });
  }

  // posters, notices and alarm beacons on wall faces
  let nb = 0;
  for (let r = 1; r < ROWS - 1; r++) for (let c = 1; c < COLS - 1; c++) {
    if (!open(c, r) || !indoor(c, r)) continue;
    for (const [dc, dr] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      if (ch(c + dc, r + dr) !== '#') continue;
      const x = c * S + S / 2 + dc * (S / 2 - .02), z = r * S + S / 2 + dr * (S / 2 - .02), ry = Math.atan2(-dc, -dr), roll = rnd();
      if (roll < .1) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.5), roll < .05 ? M.poster : lam({ map: noticeTex[Math.floor(rnd() * noticeTex.length)] })); p.position.set(x, 2.1, z); p.rotation.y = ry + (rnd() - .5) * .06; add(p); }
      else if (roll > .965 && nb < 10) {
        nb++; const b = new THREE.Group(); b.position.set(x - dc * .1, 3.4, z - dr * .1); b.rotation.y = ry;
        piece(b, .3, .1, .2, M.dark, 0, -.1, 0); const dome = new THREE.Mesh(new THREE.SphereGeometry(.16, 10, 8, 0, 6.3, 0, 1.6), M.beacon); dome.position.y = -.05; b.add(dome); add(b); A.beacons.push(dome);
      }
    }
  }

  // ceiling pipes along long east-west runs, a few venting steam
  for (let r = 1; r < YARD_ROW; r++) {
    let run = [];
    for (let c = 0; c <= COLS; c++) {
      if (c < COLS && open(c, r) && ch(c, r - 1) === '#') { run.push(c); continue; }
      if (run.length >= 3 && rnd() < .6) {
        const x0 = run[0] * S, x1 = (run[run.length - 1] + 1) * S, z = r * S + .45;
        for (const [dy, rad, m] of [[0, .14, M.metal], [-.4, .09, M.red]]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, x1 - x0, 8), m); p.rotation.z = Math.PI / 2; p.position.set((x0 + x1) / 2, WH - .4 + dy, z); add(p); }
        if (rnd() < .6) A.vents.push(new THREE.Vector3(x0 + (x1 - x0) * rnd(), WH - .4, z + .2));
      }
      run = [];
    }
  }

  // rooftop clutter for the aerial shots
  for (const [c, r] of ceilCells) {
    const v = rnd(), x = c * S + S / 2, z = r * S + S / 2;
    if (v < .06) { const g = new THREE.Group(); g.position.set(x, WH + .3, z); piece(g, 1.6, .9, 1.2, M.cream, 0, .45, 0); const fan = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, .05, 12), M.dark); fan.position.y = .93; g.add(fan); add(g); }
    else if (v < .1) { const g = new THREE.Group(); g.position.set(x, WH + .3, z); piece(g, .5, .7, .5, M.metal, 0, .35, 0); piece(g, .7, .1, .7, M.metal, 0, .75, 0); add(g); }
    else if (v < .115) { const m = new THREE.Mesh(new THREE.CylinderGeometry(.04, .06, 4, 6), M.metal); m.position.set(x, WH + 2.3, z); add(m); }
  }

  // the desert outside the walls
  const desert = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), lam({ map: sandTex.clone() }));
  desert.material.map.repeat.set(120, 120); desert.material.map.needsUpdate = true;
  desert.rotation.x = -Math.PI / 2; desert.position.set(COLS * S / 2, -.02, ROWS * S / 2); add(desert);
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2 + rnd() * .4, d = 220 + rnd() * 140, h = 18 + rnd() * 30;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(20 + rnd() * 30, 34 + rnd() * 40, h, 7), M.mesa);
    m.position.set(COLS * S / 2 + Math.cos(a) * d, h / 2 - 1, ROWS * S / 2 + Math.sin(a) * d); add(m);
  }
  for (const [x, z] of [[-3, -3], [COLS * S + 3, -3], [-3, ROWS * S + 3], [COLS * S + 3, ROWS * S + 3]]) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) piece(g, .25, 8, .25, M.metal, a * 1.3, 4, b * 1.3);
    piece(g, 3.4, 1.6, 3.4, M.olive, 0, 8.8, 0); piece(g, 4, .2, 4, M.red, 0, 9.7, 0); add(g);
  }

  // crash site: wreck on the roof, burning rubble under the hole, dust in the light shaft
  const hx = HOLE[0] * S + S / 2, hz = HOLE[1] * S + S / 2;
  const wreck = new THREE.Group(); wreck.position.set(hx + 3.5, WH + .9, hz - 2.6); wreck.rotation.set(.25, .8, -.35);
  piece(wreck, 2.2, 1.7, 4.6, M.char, 0, 0, 0); piece(wreck, .5, .5, 4, M.char, 0, .4, -4); piece(wreck, .1, 1.2, 1, M.char, 0, .9, -5.8);
  const blade = new THREE.Mesh(box(6, .05, .3), M.dark); blade.position.set(-1, 1, 0); blade.rotation.y = .4; wreck.add(blade);
  wreck.visible = !withCrash; add(wreck); A.wreck = wreck;
  const rubble = new THREE.Group(); rubble.position.set(hx, 0, hz);
  for (let i = 0; i < 9; i++) { const k = piece(rubble, .4 + rnd() * .8, .2 + rnd() * .4, .4 + rnd() * .8, i % 3 ? M.roof : M.char, (rnd() - .5) * 1.8, .15, (rnd() - .5) * 1.8); k.rotation.set(rnd(), rnd() * 3, rnd()); }
  const rb = new THREE.Mesh(box(3.4, .05, .3), M.dark); rb.position.set(.4, .5, -.2); rb.rotation.set(.1, .7, .35); rubble.add(rb);
  rubble.visible = !withCrash; add(rubble); A.rubble = rubble;
  W.obstacles.push({ x: hx, z: hz, r: .9, dead: false });
  const flameMat = basic({ color: 0xffa040, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  for (let i = 0; i < 6; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(.25 + rnd() * .2, .9 + rnd() * .6, 6), flameMat); f.position.set(hx + (rnd() - .5) * 1.2, .5, hz + (rnd() - .5) * 1.2); f.visible = !withCrash; add(f); A.fireBits.push(f); }
  const fl = new THREE.PointLight(0xff8a3a, withCrash ? 0 : 20, 10, 1.5); fl.position.set(hx, 1.2, hz); add(fl); A.fireLight = fl;
  const dg = new THREE.BufferGeometry(), pts = new Float32Array(180 * 3);
  for (let i = 0; i < 180; i++) { pts[i * 3] = hx + (rnd() - .5) * S; pts[i * 3 + 1] = rnd() * WH; pts[i * 3 + 2] = hz + (rnd() - .5) * S; }
  dg.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  A.dust = add(new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xfff4d8, size: .05, transparent: true, opacity: .8 })));
}

export function revealCrash(A) { A.wreck.visible = true; A.rubble.visible = true; A.fireBits.forEach(f => f.visible = true); A.fireLight.intensity = 20; }
