import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { MAP, S, WH, ROWS, COLS, TARGET_NAMES, makeTex, grain, stripes } from './core.js';

// Level 4 dressing: Saltcrown, the Watch's fortress on the white flats, and the bell they cast from Vault glass.
const ch = (c, r) => (MAP[r] || '')[c] || '#';
const open = (c, r) => !'#BTDFucL'.includes(ch(c, r));
let seed = 61; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const lam = o => new THREE.MeshLambertMaterial(o), basic = o => new THREE.MeshBasicMaterial(o);
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const TEAL = 0x7fe3ee, RED = 0x9e2b25;

const saltTex = makeTex((g, w, h) => {
  grain(g, w, h, '#f1ece6', .045, 5000);
  g.strokeStyle = 'rgba(150,120,120,.28)'; g.lineWidth = 2;
  for (let y = 0; y <= h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); for (let x = (y / 32) % 2 ? 0 : 32; x < w; x += 64) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 32); g.stroke(); } }
  g.fillStyle = 'rgba(230,180,180,.18)'; for (let i = 0; i < 10; i++) g.fillRect(Math.random() * w, Math.random() * h, 30, 14);
  g.fillStyle = '#9e2b25'; g.fillRect(0, h - 22, w, 8);
});
const floorTex = makeTex((g, w, h) => {
  grain(g, w, h, '#ece6dd', .04, 4000);
  g.strokeStyle = 'rgba(120,100,95,.22)'; g.lineWidth = 3; g.strokeRect(2, 2, w - 4, h - 4);
  g.strokeStyle = 'rgba(120,100,95,.12)'; g.lineWidth = 1.5; for (let i = 0; i < 5; i++) { g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (Math.random() - .5) * 60; y += (Math.random() - .5) * 60; g.lineTo(x, y); } g.stroke(); }
}, 256, 256, COLS, ROWS);
const flatTex = makeTex((g, w, h) => {
  g.fillStyle = '#f4f1ec'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(160,150,140,.35)'; g.lineWidth = 2;
  const R = 32, hx = R * Math.sqrt(3);
  for (let row = -1; row < h / (R * 1.5) + 1; row++) for (let col = -1; col < w / hx + 1; col++) {
    const cx = col * hx + (row % 2 ? hx / 2 : 0), cy = row * R * 1.5;
    g.beginPath(); for (let i = 0; i <= 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; const px = cx + Math.cos(a) * (R - 2 + Math.random() * 2), py = cy + Math.sin(a) * (R - 2 + Math.random() * 2); i ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke();
  }
}, 256, 256);
const bannerTex = makeTex((g, w, h) => {
  g.fillStyle = '#9e2b25'; g.fillRect(0, 0, w, h); g.fillStyle = '#7a1f1a'; g.fillRect(0, 0, 10, h); g.fillRect(w - 10, 0, 10, h);
  g.fillStyle = '#f7f0e1'; g.beginPath(); g.moveTo(w / 2 - 34, h * .62); g.quadraticCurveTo(w / 2 - 30, h * .2, w / 2, h * .2); g.quadraticCurveTo(w / 2 + 30, h * .2, w / 2 + 34, h * .62); g.closePath(); g.fill();
  g.fillRect(w / 2 - 40, h * .62, 80, 8); g.beginPath(); g.arc(w / 2, h * .7, 9, 0, 7); g.fill();
  g.font = '22px Impact'; g.textAlign = 'center'; g.fillText('WE SHALL', w / 2, h * .84); g.fillText('NOT END', w / 2, h * .93);
}, 128, 256);
function plateTex(text) { return makeTex((g, w, h) => { grain(g, w, h, '#4a4c44', .1, 3000); stripes(g, 0, 0, w, 34); g.fillStyle = '#f7f0e1'; g.font = '30px Impact'; g.textAlign = 'center'; g.fillText(text, w / 2, h / 2 + 22); g.fillStyle = '#ff9a3c'; g.fillRect(40, h - 70, w - 80, 26); }, 256, 256); }
const exitTex = makeTex((g, w, h) => {
  g.fillStyle = '#e7f2e9'; g.fillRect(0, 0, w, h); g.fillStyle = '#2f8f4e';
  for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(w * .2, h * (.75 - i * .22)); g.lineTo(w * .5, h * (.55 - i * .22)); g.lineTo(w * .8, h * (.75 - i * .22)); g.lineTo(w * .8, h * (.85 - i * .22)); g.lineTo(w * .5, h * (.65 - i * .22)); g.lineTo(w * .2, h * (.85 - i * .22)); g.fill(); }
}, 128, 128);

export const M4 = {
  salt: lam({ map: saltTex }), floor: lam({ map: floorTex }), top: lam({ color: 0xe2dad2 }), red: lam({ color: RED }), dark: lam({ color: 0x2b2a27 }), iron: lam({ color: 0x55574f }),
  glass: lam({ color: 0xcdf1f6, emissive: 0x1a5e6a, transparent: true, opacity: .62, side: THREE.DoubleSide }), gold: lam({ color: 0xf2b51c, emissive: 0x5a3a00 }),
  tine: lam({ color: 0xbff4f6, emissive: 0x2a9daa }), banner: lam({ map: bannerTex, side: THREE.DoubleSide }), molten: basic({ color: 0xffa24a }), skin: lam({ color: 0xc99a6e }), rag: lam({ color: 0xb7aa92 }),
};
export const wallMats4 = [M4.salt, M4.salt, M4.top, M4.salt, M4.salt, M4.salt];

// glass furnaces: where the Watch melts Vault glass into the bell
export function makeFurnace(L, c, r, idx) {
  const name = TARGET_NAMES[idx], x = c * S + S / 2, z = r * S + S / 2, g = new THREE.Group(); g.position.set(x, 0, z);
  const base = new THREE.Mesh(box(2.8, 2.2, 2.8), [M4.iron, M4.iron, M4.iron, M4.iron, lam({ map: plateTex(name) }), lam({ map: plateTex(name) })]);
  base.position.y = 1.1; base.castShadow = base.receiveShadow = true; g.add(base); L.statics.push(base);
  const mouth = new THREE.Mesh(box(1.2, .6, .05), M4.molten); mouth.position.set(0, .9, 1.43); g.add(mouth);
  const mouth2 = mouth.clone(); mouth2.position.z = -1.43; g.add(mouth2);
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(.9, .9, 1.8, 16, 1, true), M4.glass); tank.position.y = 3.1; g.add(tank);
  const melt = new THREE.Mesh(new THREE.CylinderGeometry(.82, .82, 1, 16), basic({ color: 0x9feef4 })); melt.position.y = 2.7; g.add(melt);
  const stack = new THREE.Mesh(new THREE.CylinderGeometry(.25, .32, 3, 8), M4.dark); stack.position.set(.9, 4, -.9); g.add(stack);
  const light = new THREE.PointLight(0xff9a3c, 18, 12, 1.5); light.position.y = 1.5; g.add(light);
  L.group.add(g);
  L.targets.push({ idx, name, x, z, c, r, planted: false, g, base, led: null, parts: [tank, melt, mouth, mouth2], light, stack, broken: false });
}
export function breakFurnace(t) { t.broken = true; t.parts.forEach(p => p.visible = false); t.light.intensity = 0; t.stack.rotation.z = .5; t.base.material = M4.dark; }

export function makeSaltGate(L, cx, cz) {
  const g = new THREE.Group(); g.position.set(cx, WH / 2, cz);
  for (let i = 0; i < 6; i++) { const bar = new THREE.Mesh(box(.14, WH, .14), M4.iron); bar.position.x = -1.7 + i * .68; bar.castShadow = true; g.add(bar); }
  for (const y of [-1.2, .2, 1.6]) { const rail = new THREE.Mesh(box(S, .16, .18), M4.iron); rail.position.y = y; g.add(rail); }
  const solid = new THREE.Mesh(box(S, WH, .3), basic({ visible: false })); g.add(solid); // invisible slab so bullets stop at the gate
  L.group.add(g); L.statics.push(solid); L.gateMeshes.push(g);
}

export function decorateSaltcrown(L) {
  seed = 61;
  const A = L.anim = { banners: [], forkAnim: [], cages: [], exitLight: null, bell: null };
  L.forks = []; L.prisoners = [];
  const add = o => (L.group.add(o), o);

  // battlements on every exposed wall, red-roofed towers at the corners
  const merlon = box(1.1, .9, 1.1);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (ch(c, r) !== '#' || ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => ch(c + a, r + b) !== '#')) continue;
    for (const [ox, oz] of [[-1, -1], [1, 1]]) { const m = new THREE.Mesh(merlon, M4.salt); m.position.set(c * S + S / 2 + ox * .95, WH + .3 + .45, r * S + S / 2 + oz * .95); m.castShadow = true; add(m); }
  }
  for (const [x, z] of [[2, 2], [COLS * S - 2, 2], [2, ROWS * S - 2], [COLS * S - 2, ROWS * S - 2], [CXm(), -5]]) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3, 11, 10), M4.salt); t.position.set(x, 5.5, z); t.castShadow = true; add(t);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.3, 3, 10), M4.red); roof.position.set(x, 12.5, z); add(roof);
  }
  // banners on inner walls
  for (let r = 1; r < ROWS - 1; r++) for (let c = 1; c < COLS - 1; c++) {
    if (!open(c, r)) continue;
    for (const [dc, dr] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      if (ch(c + dc, r + dr) !== '#' || rnd() > .1) continue;
      const b = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 2.6), M4.banner);
      b.position.set(c * S + S / 2 + dc * (S / 2 - .06), 2.6, r * S + S / 2 + dr * (S / 2 - .06)); b.rotation.y = Math.atan2(-dc, -dr); add(b); A.banners.push({ b, ph: rnd() * 6, base: b.rotation.y });
    }
  }
  // the Great Bell
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (ch(c, r) === 'u') {
    const x = c * S + S / 2, z = r * S + S / 2, g = new THREE.Group(); g.position.set(x, 0, z);
    for (const [px, pz] of [[-1.7, -1.7], [1.7, 1.7], [-1.7, 1.7], [1.7, -1.7]]) { const p = new THREE.Mesh(box(.5, 10, .5), M4.iron); p.position.set(px, 5, pz); p.castShadow = true; g.add(p); }
    const beam = new THREE.Mesh(box(4.2, .5, .5), M4.iron); beam.position.y = 10; g.add(beam); const beam2 = beam.clone(); beam2.rotation.y = Math.PI / 2; g.add(beam2);
    const pts = []; for (let i = 0; i <= 12; i++) { const k = i / 12; pts.push(new THREE.Vector2(.35 + Math.pow(k, 1.8) * 1.6 + (k > .9 ? (k - .9) * 3 : 0), 5.2 - k * 5)); }
    const bellMat = M4.glass.clone(); bellMat.opacity = .7;
    const hang = new THREE.Group(); hang.position.y = 9.8; g.add(hang);
    const bell = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), bellMat); bell.position.y = -5.4; hang.add(bell);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(2.25, .1, 8, 40), M4.gold); rim.rotation.x = Math.PI / 2; rim.position.y = -5.35; hang.add(rim);
    const clap = new THREE.Mesh(new THREE.SphereGeometry(.42, 14, 10), M4.gold); clap.position.y = -4.6; hang.add(clap);
    const rings = [0, 1].map(i => { const ring = new THREE.Mesh(new THREE.TorusGeometry(3 + i * .9, .05, 6, 48), basic({ color: TEAL, transparent: true, opacity: .5 })); ring.rotation.x = Math.PI / 2; ring.position.y = 3 + i * 2; g.add(ring); return ring; });
    const solid = new THREE.Mesh(box(3.4, 9, 3.4), basic({ visible: false })); solid.position.y = 4.5; solid.userData.bellHit = true; g.add(solid);
    const light = new THREE.PointLight(0x9feef4, 30, 26, 1.3); light.position.y = 4; g.add(light);
    add(g); L.statics.push(solid);
    A.bell = L.bell = { x, z, g, hang, bell, bellMat, rings, light, clap, alive: true, planted: false };
  }
  // tuning forks that shield the Choirguard
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (ch(c, r) === 'F') {
    const x = c * S + S / 2, z = r * S + S / 2, g = new THREE.Group(); g.position.set(x, 0, z);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.9, 1.1, .6, 10), M4.iron); base.position.y = .3; g.add(base);
    const stem = new THREE.Mesh(box(.25, 1.6, .25), M4.iron); stem.position.y = 1.4; g.add(stem);
    const yoke = new THREE.Mesh(box(1.1, .25, .25), M4.tine); yoke.position.y = 2.25; g.add(yoke);
    const tines = [-.45, .45].map(px => { const t = new THREE.Mesh(box(.2, 2.6, .2), M4.tine.clone()); t.position.set(px, 3.55, 0); g.add(t); return t; });
    const aura = new THREE.Mesh(new THREE.TorusGeometry(1.4, .04, 6, 32), basic({ color: TEAL, transparent: true, opacity: .6 })); aura.rotation.x = Math.PI / 2; aura.position.y = 3.6; g.add(aura);
    const light = new THREE.PointLight(0x9feef4, 10, 9, 1.6); light.position.y = 3.5; g.add(light);
    add(g);
    const fork = { x, z, g, tines, aura, light, hp: 90, alive: true };
    [base, stem, yoke, ...tines].forEach(m => { m.userData.fork = fork; L.hitList.push(m); });
    L.forks.push(fork);
  }
  // prisoner cages
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (ch(c, r) === 'c') {
    const x = c * S + S / 2, z = r * S + S / 2, g = new THREE.Group(); g.position.set(x, 0, z);
    const floorP = new THREE.Mesh(box(3, .12, 3), M4.iron); floorP.position.y = .06; g.add(floorP);
    const roofP = floorP.clone(); roofP.position.y = 2.7; g.add(roofP);
    const door = new THREE.Group(); g.add(door);
    for (let i = 0; i < 6; i++) for (let side = 0; side < 4; side++) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 2.6, 5), M4.iron);
      const t = -1.25 + i * .5, pos = [[t, -1.45], [t, 1.45], [-1.45, t], [1.45, t]][side];
      bar.position.set(pos[0], 1.35, pos[1]); (side === 3 ? door : g).add(bar);
    }
    const fig = new THREE.Group(); fig.position.set(-.2, 0, 0); g.add(fig);
    const legs = new THREE.Mesh(box(.4, .5, .5), M4.rag); legs.position.y = .3; fig.add(legs);
    const body = new THREE.Mesh(box(.6, .7, .38), M4.rag); body.position.y = .9; fig.add(body);
    const head = new THREE.Mesh(box(.32, .32, .32), M4.skin); head.position.y = 1.45; fig.add(head);
    const arm = new THREE.Mesh(box(.18, .55, .18), M4.glass); arm.position.set(.4, 1, .1); arm.rotation.z = .4; fig.add(arm);
    add(g);
    L.prisoners.push({ idx: L.prisoners.length, x, z, g, door, fig, freed: false });
  }
  // exfil: the Watch truck pool beyond the north gate
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (ch(c, r) === 'X') {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(S, S), lam({ map: exitTex })); m.rotation.x = -Math.PI / 2; m.position.set(c * S + S / 2, .02, r * S + S / 2); add(m);
  }
  A.exitLight = add(new THREE.PointLight(0x3cff7a, 24, 14, 1.5)); A.exitLight.position.set(11 * S, 2, 1.5 * S);
  // the white flats outside, a road south, and salt spires on the horizon
  const flat = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), lam({ map: flatTex })); flat.material.map.repeat.set(90, 90);
  flat.rotation.x = -Math.PI / 2; flat.position.set(COLS * S / 2, -.03, ROWS * S / 2); add(flat);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(9, 360), lam({ color: 0xd9d2c6 })); road.rotation.x = -Math.PI / 2; road.position.set(CXm(), -.01, ROWS * S + 180); add(road);
  for (let i = 0; i < 16; i++) {
    const a = rnd() * 6.28, d = 160 + rnd() * 200, h = 10 + rnd() * 40;
    const sp = new THREE.Mesh(new THREE.ConeGeometry(3 + rnd() * 8, h, 6), lam({ color: 0xf4eeea })); sp.position.set(COLS * S / 2 + Math.cos(a) * d, h / 2 - 1, ROWS * S / 2 + Math.sin(a) * d); add(sp);
  }
  A.update = (dt, t, P, G) => {
    for (const b of A.banners) b.b.rotation.y = b.base + Math.sin(t * 1.3 + b.ph) * .06;
    for (const f of L.forks) if (f.alive) { f.tines.forEach((tn, i) => tn.position.x = (i ? .45 : -.45) + Math.sin(t * 60 + i * Math.PI) * .012); f.aura.scale.setScalar(1 + Math.sin(t * 4 + f.x) * .15); }
    const bl = L.bell;
    if (bl && bl.alive) {
      const charge = G.bellCharge || 0;
      bl.hang.rotation.z = Math.sin(t * .8) * (.03 + charge * .12); bl.clap.position.x = Math.sin(t * .8 + .6) * (.1 + charge * .4);
      bl.light.intensity = 26 + charge * 120 + Math.sin(t * 3) * 4; bl.bellMat.emissive.setRGB(.1 + charge * .5, .37 + charge * .5, .42 + charge * .5);
      bl.rings.forEach((rg, i) => { rg.scale.setScalar(1 + charge * (1.5 + i)); rg.material.opacity = .5 - charge * .3; rg.rotation.z += dt * (.2 + i * .1); });
    }
    for (const p of L.prisoners) if (!p.freed) p.fig.rotation.y = Math.sin(t * .5 + p.idx) * .4;
    if (A.exitLight) A.exitLight.intensity = 20 + Math.sin(t * 3) * 6;
  };
}
function CXm() { return COLS * S / 2; }

export function breakFork(f) { f.alive = false; f.tines.forEach(t => { t.rotation.z = (t.position.x > 0 ? 1 : -1) * .9; t.material.emissive.setHex(0); t.material.color.setHex(0x8a9a9c); }); f.aura.visible = false; f.light.intensity = 0; }
export function freeCage(p) { p.freed = true; p.door.rotation.y = -1.4; p.door.position.set(1.45, 0, 1.45); p.fig.visible = false; }
export function shatterBell(bl) { bl.alive = false; bl.bell.visible = false; bl.rings.forEach(r => r.visible = false); bl.light.intensity = 0; bl.clap.visible = false; }
