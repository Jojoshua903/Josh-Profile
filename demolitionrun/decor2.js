import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { MAP, S, WH, ROWS, COLS, W, TARGET_NAMES, makeTex, grain } from './core.js';

// Level 2 dressing: the Undervault beneath Ironveil.
const ch = (c, r) => (MAP[r] || '')[c] || '#';
const open = (c, r) => !'#BTDKQL'.includes(ch(c, r));
let seed = 23; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const lam = o => new THREE.MeshLambertMaterial(o), basic = o => new THREE.MeshBasicMaterial(o);
const TEAL = 0x2a9d9a, GOLD = 0xf2b51c;

const stoneTex = makeTex((g, w, h) => {
  grain(g, w, h, '#e7dfcf', .05, 5000);
  for (let y = 12; y < h; y += 18 + Math.random() * 20) { g.fillStyle = `rgba(150,120,90,${.08 + Math.random() * .1})`; g.fillRect(0, y, w, 2 + Math.random() * 4); }
  g.strokeStyle = 'rgba(214,170,60,.45)'; g.lineWidth = 2; g.beginPath(); let x = Math.random() * w; g.moveTo(x, 0); for (let y = 0; y < h; y += 20) { x += (Math.random() - .5) * 40; g.lineTo(x, y); } g.stroke();
});
const floorTex = makeTex((g, w, h) => {
  grain(g, w, h, '#ece4d4', .04, 4000);
  g.strokeStyle = 'rgba(120,100,80,.25)'; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2);
  g.strokeStyle = 'rgba(200,150,40,.55)'; g.lineWidth = 3; g.beginPath(); g.arc(w / 2, h / 2, w * .3, 0, 7); g.stroke();
  g.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.moveTo(w / 2 + Math.cos(a) * w * .3, h / 2 + Math.sin(a) * h * .3); g.lineTo(w / 2 + Math.cos(a) * w * .42, h / 2 + Math.sin(a) * h * .42); } g.stroke();
}, 256, 256, COLS, ROWS);
const runeTex = [0, 1, 2, 3].map(() => makeTex((g, w, h) => {
  g.clearRect(0, 0, w, h); g.strokeStyle = '#d9a21a'; g.lineWidth = 6; g.lineCap = 'round';
  g.beginPath(); g.arc(w / 2, h / 2, w * .38, 0, 7); g.stroke();
  for (let i = 0; i < 4; i++) { g.beginPath(); const a = Math.random() * 6.3; g.moveTo(w / 2, h / 2); g.lineTo(w / 2 + Math.cos(a) * w * .3, h / 2 + Math.sin(a) * h * .3); g.arc(w / 2, h / 2, w * .3, a, a + Math.random() * 1.5); g.stroke(); }
  g.fillStyle = '#d9a21a'; g.beginPath(); g.arc(w / 2, h / 2, 8, 0, 7); g.fill();
}, 128, 128));
const moonTex = makeTex((g, w, h) => {
  grain(g, w, h, '#ddd3c0', .05, 6000);
  g.strokeStyle = '#b89448'; g.lineWidth = 6; for (const r of [120, 100]) { g.beginPath(); g.arc(w / 2, h / 2, r, 0, 7); g.stroke(); }
  g.fillStyle = '#f7f0e1'; g.beginPath(); g.arc(w / 2, h / 2, 90, 0, 7); g.fill();
  g.fillStyle = '#ddd3c0'; g.beginPath(); g.arc(w / 2 + 34, h / 2 - 10, 80, 0, 7); g.fill();
  g.fillStyle = '#b89448'; for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; g.fillRect(w / 2 + Math.cos(a) * 110 - 3, h / 2 + Math.sin(a) * 110 - 3, 6, 6); }
  g.strokeStyle = 'rgba(42,157,154,.6)'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, h - 20); g.lineTo(w, h - 20); g.moveTo(0, 20); g.lineTo(w, 20); g.stroke();
}, 1024, 256);
const domeTex = makeTex((g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#d7d0e2'); gr.addColorStop(1, '#efe8dc'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(42,157,154,.12)'; for (let i = 0; i < 80; i++) g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 3, 10 + Math.random() * 30); }, 256, 256);

export const M2 = {
  stone: lam({ map: stoneTex }), floor: lam({ map: floorTex }), rock: lam({ color: 0xd9cfbd }),
  crystal: lam({ color: 0x9fe6e0, emissive: 0x1e6f6c, transparent: true, opacity: .8 }),
  rune: basic({ map: runeTex[0], transparent: true, opacity: .4, depthWrite: false }),
  gold: lam({ color: GOLD, emissive: 0x5a3a00 }), dark: lam({ color: 0x2b2a27 }), red: lam({ color: 0xd2391b }),
  lamp: basic({ color: 0xfff1b0 }), metal: lam({ color: 0x6b6d62 }),
};
export const wallMats2 = [M2.stone, M2.stone, M2.rock, M2.stone, M2.stone, M2.stone];

export function makePillar(L, c, r, idx) {
  const name = TARGET_NAMES[idx];
  const x = c * S + S / 2, z = r * S + S / 2, g = new THREE.Group(); g.position.set(x, 0, z);
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.4, 2.8), M2.stone); base.position.y = .7; base.castShadow = base.receiveShadow = true; g.add(base); L.statics.push(base);
  const obel = new THREE.Mesh(new THREE.CylinderGeometry(.45, .85, 5, 4), M2.stone); obel.rotation.y = Math.PI / 4; obel.position.y = 3.9; obel.castShadow = true; g.add(obel);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(.72, .74, .3, 4), basic({ color: TEAL })); band.rotation.y = Math.PI / 4; band.position.y = 3; g.add(band);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, .06, 6, 40), M2.gold); ring.position.y = 4; g.add(ring);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(.55, 0), M2.crystal.clone()); gem.position.y = 7.2; g.add(gem);
  const light = new THREE.PointLight(0x7ff7ee, 22, 16, 1.5); light.position.y = 4; g.add(light);
  L.group.add(g);
  L.targets.push({ idx, name, x, z, c, r, planted: false, g, base, led: null, parts: [obel, band, ring, gem], ring, gem, light, broken: false });
}

export function makeMoonGate(L, cx, cz, i) {
  const t = moonTex.clone(); t.repeat.set(.25, 1); t.offset.set(i * .25, 0); t.needsUpdate = true;
  const face = lam({ map: t });
  const m = new THREE.Mesh(new THREE.BoxGeometry(S, WH, .8), [M2.stone, M2.stone, M2.stone, M2.stone, face, face]);
  m.position.set(cx, WH / 2, cz); m.castShadow = true; L.group.add(m); L.statics.push(m); L.gateMeshes.push(m);
}

export function decorateVault(L, withCine) {
  seed = 23;
  M2.crystal.color.setHex(0x9fe6e0); M2.crystal.emissive.setHex(0x1e6f6c);
  const A = L.anim = { floaters: [], pebbles: [], runes: [], crystals: [], lamps: [], rings: [], chimes: [], stage: 0, shaft: null, sand: null };
  const add = o => (L.group.add(o), o);

  // ragged rock above every exposed wall so the halls read as a cavern
  const dodec = new THREE.DodecahedronGeometry(1, 0);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (ch(c, r) !== '#') continue;
    if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => ch(c + a, r + b) !== '#')) continue;
    const m = new THREE.Mesh(dodec, M2.rock); const s = 2 + rnd() * 1.4;
    m.scale.set(s, s * (1 + rnd() * 1.6), s); m.position.set(c * S + S / 2 + (rnd() - .5), WH + s * .6, r * S + S / 2 + (rnd() - .5)); m.rotation.set(rnd(), rnd() * 3, rnd());
    m.castShadow = true; add(m);
  }
  // crystal clusters (solid 'K' cells)
  let kl = 0;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (ch(c, r) !== 'K') continue;
    const g = new THREE.Group(); g.position.set(c * S + S / 2, 0, r * S + S / 2);
    for (let i = 0; i < 6; i++) {
      const k = new THREE.Mesh(new THREE.OctahedronGeometry(.5, 0), M2.crystal); const h = 1.2 + rnd() * 2.6;
      k.scale.set(.7 + rnd() * .5, h, .7 + rnd() * .5); k.position.set((rnd() - .5) * 1.8, h * .5, (rnd() - .5) * 1.8); k.rotation.set((rnd() - .5) * .6, rnd() * 3, (rnd() - .5) * .6);
      k.userData.crystal = true; g.add(k); L.statics.push(k);
    }
    if (kl++ < 8) { const l = new THREE.PointLight(0x7ff7ee, 14, 12, 1.6); l.position.y = 2; g.add(l); A.crystals.push(l); }
    add(g);
  }
  // runes carved into wall faces
  for (let r = 1; r < ROWS - 1; r++) for (let c = 1; c < COLS - 1; c++) {
    if (!open(c, r) || r > 16) continue;
    for (const [dc, dr] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      if (ch(c + dc, r + dr) !== '#' || rnd() > .16) continue;
      const mat = M2.rune.clone(); mat.map = runeTex[Math.floor(rnd() * 4)];
      const p = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), mat);
      p.position.set(c * S + S / 2 + dc * (S / 2 - .03), 1.6 + rnd() * 1.6, r * S + S / 2 + dr * (S / 2 - .03)); p.rotation.y = Math.atan2(-dc, -dr); add(p); A.runes.push(p);
    }
  }
  // floating rock everywhere above the halls
  for (let i = 0; i < 40; i++) {
    const m = new THREE.Mesh(dodec, M2.rock); const s = .25 + rnd() * 1.1; m.scale.setScalar(s);
    m.position.set(4 + rnd() * (COLS * S - 8), 5.5 + rnd() * 12, 4 + rnd() * (ROWS * S - 16)); m.castShadow = true; add(m);
    A.floaters.push({ m, y: m.position.y, ph: rnd() * 6, sp: .2 + rnd() * .5 });
  }
  // pebbles that start to float once gravity goes wrong
  const pebGeo = new THREE.DodecahedronGeometry(.12, 0);
  for (let i = 0; i < 70; i++) {
    let c, r; do { c = 1 + Math.floor(rnd() * (COLS - 2)); r = 1 + Math.floor(rnd() * 15); } while (!open(c, r));
    const m = new THREE.Mesh(pebGeo, M2.rock); m.position.set(c * S + rnd() * S, .1, r * S + rnd() * S); m.scale.setScalar(.5 + rnd() * 1.5); add(m);
    A.pebbles.push({ m, top: .6 + rnd() * 2.4, ph: rnd() * 6 });
  }
  // the dome of the cavern with hanging stone and crystal
  const dome = new THREE.Mesh(new THREE.SphereGeometry(130, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), basic({ map: domeTex, side: THREE.BackSide }));
  dome.position.set(COLS * S / 2, -6, ROWS * S / 2); add(dome);
  for (let i = 0; i < 46; i++) {
    const a = rnd() * 6.3, d = rnd() * 80, cry = i % 4 === 0, h = 4 + rnd() * 12;
    const m = new THREE.Mesh(new THREE.ConeGeometry(.6 + rnd() * 1.6, h, 6), cry ? M2.crystal : M2.rock); m.rotation.x = Math.PI;
    m.position.set(COLS * S / 2 + Math.cos(a) * d, 26 + rnd() * 26 + h / 2, ROWS * S / 2 + Math.sin(a) * d); add(m);
  }
  // light shaft and falling sand from the sinkhole Daniel came through
  const sx = L.start.x, sz = L.start.z;
  A.shaft = add(new THREE.Mesh(new THREE.CylinderGeometry(3.2, 4.5, 90, 20, 1, true), basic({ color: 0xfff1c8, transparent: true, opacity: .16, depthWrite: false, side: THREE.DoubleSide, fog: false })));
  A.shaft.position.set(sx, 45, sz);
  const sg = new THREE.BufferGeometry(), pts = new Float32Array(260 * 3);
  for (let i = 0; i < 260; i++) { pts[i * 3] = sx + (rnd() - .5) * 5; pts[i * 3 + 1] = rnd() * 60; pts[i * 3 + 2] = sz + (rnd() - .5) * 5; }
  sg.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  A.sand = add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xd6b778, size: .09 })));
  const pile = new THREE.Mesh(new THREE.SphereGeometry(1.8, 16, 8, 0, 6.3, 0, 1.2), lam({ color: 0xe0c896 })); pile.scale.y = .35; pile.position.set(sx + 1.2, 0, sz - .6); add(pile);
  // Watch excavation gear: work lamps beside the soldiers' posts
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (ch(c, r) !== 'E' || A.lamps.length >= 4) continue;
    const g = new THREE.Group(); g.position.set(c * S + S / 2 + 1.3, 0, r * S + S / 2 + 1.3);
    for (let i = 0; i < 3; i++) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 2.2, 4), M2.metal); const a = i / 3 * 6.28; leg.position.set(Math.cos(a) * .3, 1.05, Math.sin(a) * .3); leg.rotation.set(Math.sin(a) * .15, 0, -Math.cos(a) * .15); g.add(leg); }
    const head = new THREE.Mesh(new THREE.BoxGeometry(.5, .35, .25), M2.lamp); head.position.y = 2.2; g.add(head);
    const l = new THREE.PointLight(0xffe2a0, 14, 12, 1.6); l.position.y = 2.1; g.add(l); A.lamps.push(l); add(g);
  }
  // the sanctum beyond the Moon Door: an altar holding a familiar mask
  const ax = 11 * S, az = 19 * S;
  const plate = new THREE.Mesh(new THREE.CircleGeometry(6, 40), basic({ map: runeTex[0], transparent: true, opacity: .7 })); plate.rotation.x = -Math.PI / 2; plate.position.set(ax, .03, az); add(plate);
  const altar = new THREE.Mesh(new THREE.CylinderGeometry(.9, 1.1, 1.2, 8), M2.stone); altar.position.set(ax, .6, az + 1.5); altar.castShadow = true; add(altar);
  const mask = new THREE.Group(); mask.position.set(ax, 1.75, az + 1.5);
  const hood = new THREE.Mesh(new THREE.SphereGeometry(.42, 16, 12), M2.dark); hood.scale.set(1, 1.15, .9); mask.add(hood);
  const band = new THREE.Mesh(new THREE.TorusGeometry(.42, .05, 6, 24), M2.red); band.rotation.x = Math.PI / 2; band.position.y = .12; mask.add(band);
  for (const x of [-.14, .14]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(.05, 8, 6), basic({ color: GOLD })); eye.position.set(x, .02, -.36); mask.add(eye); }
  add(mask); A.mask = mask;
  for (let i = 0; i < 3; i++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(1 + i * .45, .03, 6, 40), M2.gold); ring.position.set(ax, 1.8, az + 1.5); add(ring); A.rings.push(ring); }
  const sl = new THREE.PointLight(0xffd27a, 24, 18, 1.4); sl.position.set(ax, 3, az); add(sl);
  // singing crystals ('Q'): they must be woken smallest to largest
  const chimeMat = lam({ color: 0xf3e3a0, emissive: 0x4a3a10, transparent: true, opacity: .85 });
  let qi = 0;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (ch(c, r) !== 'Q') continue;
    const idx = qi++, s = [.75, 1.1, 1.5][idx] || 1;
    const g = new THREE.Group(); g.position.set(c * S + S / 2, 0, r * S + S / 2);
    const plate = new THREE.Mesh(new THREE.CircleGeometry(1.5, 32), basic({ map: runeTex[idx % 4], transparent: true, opacity: .8 })); plate.rotation.x = -Math.PI / 2; plate.position.y = .03; g.add(plate);
    const mat = chimeMat.clone();
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(.7, 0), mat); m.scale.set(s, s * 3.2, s); m.position.y = s * 2.3; m.userData.chime = idx; g.add(m); L.statics.push(m);
    for (let i = 0; i < 3; i++) { const k = new THREE.Mesh(new THREE.OctahedronGeometry(.25, 0), mat); k.scale.set(s, s * 2, s); k.position.set(Math.cos(i * 2.1) * s, s * .6, Math.sin(i * 2.1) * s); k.userData.chime = idx; g.add(k); L.statics.push(k); }
    const l = new THREE.PointLight(0xffe2a0, 6, 10, 1.6); l.position.y = 2; g.add(l);
    add(g); A.chimes.push({ g, m, mat, idx, light: l, lit: false, s });
  }
  A.update = (dt, t, P, G) => updateVault(A, L, dt, t, P, G);
}

function updateVault(A, L, dt, t, P, G) {
  for (const f of A.floaters) { f.m.position.y = f.y + Math.sin(t * f.sp + f.ph) * .6 + (A.stage >= 1 ? 2 : 0); f.m.rotation.y += dt * f.sp * .4; f.m.rotation.x += dt * .05; }
  if (A.stage >= 1) for (const p of A.pebbles) { const y = p.top + Math.sin(t * .8 + p.ph) * .25; p.m.position.y += (y - p.m.position.y) * Math.min(1, dt * .8); p.m.rotation.x += dt; }
  for (const r of A.runes) { const d = Math.hypot(r.position.x - P.x, r.position.z - P.z); r.material.opacity = (A.stage >= 2 ? .5 : .25) + Math.max(0, 1 - d / 9) * .65 + Math.sin(t * 2 + r.position.x) * .05; }
  const pulse = .8 + Math.sin(t * 1.7) * .25;
  A.crystals.forEach((l, i) => l.intensity = 14 * (pulse + Math.sin(t * 3 + i) * .1));
  for (const tg of L.targets) if (!tg.broken) { tg.ring.rotation.x = Math.sin(t * .7 + tg.idx) * .8; tg.ring.rotation.y += dt * .9; tg.gem.position.y = 7.2 + Math.sin(t * 1.4 + tg.idx) * .3; tg.gem.rotation.y += dt * 1.5; }
  A.rings.forEach((r, i) => { r.rotation.x += dt * (.3 + i * .2); r.rotation.y += dt * (.5 - i * .15); });
  A.mask.rotation.y = Math.sin(t * .5) * .4; A.mask.position.y = 1.75 + Math.sin(t * 1.2) * .08;
  const s = A.sand.geometry.attributes.position; for (let i = 0; i < s.count; i++) { let y = s.getY(i) - dt * (A.stage >= 1 ? .8 : 2.5); if (y < 0) y = 60; s.setY(i, y); } s.needsUpdate = true;
  A.shaft.material.opacity = .13 + Math.sin(t * .6) * .03;
  for (const q of A.chimes) { q.m.rotation.y += dt * (q.lit ? 2 : .3); q.mat.emissive.setHex(q.lit ? 0xc89020 : 0x4a3a10); q.light.intensity = q.lit ? 22 : 6 + Math.sin(t * 2 + q.idx) * 2; }
}
export function setChime(A, idx, lit) { const q = A.chimes.find(c => c.idx === idx); if (q) q.lit = lit; }

// called each time a Choir Stone falls
export function shiftVault(A, stage) {
  A.stage = stage;
  if (stage >= 3) { M2.crystal.color.setHex(0xffd88a); M2.crystal.emissive.setHex(0x6b3d00); A.crystals.forEach(l => l.color.setHex(0xffc46b)); }
}
export function breakPillar(t) { t.broken = true; t.parts.forEach(p => p.visible = false); t.light.intensity = 0; t.base.material = M2.rock; }
