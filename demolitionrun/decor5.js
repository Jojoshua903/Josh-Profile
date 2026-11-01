import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { MAP, S, WH, ROWS, COLS, W, TARGET_NAMES, makeTex, grain } from './core.js';

// Level 5 dressing: Sarrat, the Order of Quiet Sand's monastery, cut into a red canyon.
const ch = (c, r) => (MAP[r] || '')[c] || '#';
const open = (c, r) => !'#BTDLw'.includes(ch(c, r));
let seed = 83; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const lam = o => new THREE.MeshLambertMaterial(o), basic = o => new THREE.MeshBasicMaterial(o);
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const TURQ = 0x2f9c95;

function strata(g, w, h) {
  const bands = ['#d98b5f', '#e8a879', '#c8714a', '#f0c49a', '#d2865a', '#e49d6d'];
  let y = 0; while (y < h) { const bh = 10 + Math.random() * 30; g.fillStyle = bands[Math.floor(Math.random() * bands.length)]; g.fillRect(0, y, w, bh); y += bh; }
  for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '90,40,20' : '255,235,210'},${Math.random() * .12})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
}
const rockTex = makeTex((g, w, h) => strata(g, w, h));
const crackTex = makeTex((g, w, h) => {
  strata(g, w, h);
  g.strokeStyle = 'rgba(50,20,10,.85)'; g.lineCap = 'round';
  for (let i = 0; i < 7; i++) { g.lineWidth = 2 + Math.random() * 4; g.beginPath(); let x = w / 2, y = h / 2; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (Math.random() - .5) * 70; y += (Math.random() - .5) * 70; g.lineTo(x, y); } g.stroke(); }
  // a chalk hammer mark left by the Order's masons
  g.strokeStyle = 'rgba(255,250,240,.9)'; g.lineWidth = 6; g.beginPath(); g.moveTo(w * .35, h * .78); g.lineTo(w * .62, h * .5); g.stroke();
  g.fillStyle = 'rgba(255,250,240,.9)'; g.save(); g.translate(w * .64, h * .48); g.rotate(-.78); g.fillRect(-22, -12, 44, 24); g.restore();
});
const floorTex = makeTex((g, w, h) => {
  grain(g, w, h, '#efd9bf', .05, 5000);
  g.strokeStyle = 'rgba(140,80,50,.3)'; g.lineWidth = 3; g.strokeRect(2, 2, w - 4, h - 4); g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();
  g.strokeStyle = 'rgba(47,156,149,.45)'; g.lineWidth = 3; g.beginPath(); g.arc(w / 2, h / 2, 34, 0, 7); g.stroke(); g.beginPath(); g.arc(w / 2, h / 2, 12, 0, 7); g.stroke();
}, 256, 256, COLS, ROWS);
const sigilTex = makeTex((g, w, h) => {
  g.fillStyle = '#f6e7d2'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#2f9c95'; g.lineWidth = 8; for (const r of [110, 80]) { g.beginPath(); g.arc(w / 2, h / 2, r, 0, 7); g.stroke(); }
  g.strokeStyle = '#c8321e'; g.lineWidth = 6; g.beginPath(); for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 - Math.PI / 2; g.lineTo(w / 2 + Math.cos(a) * 70, h / 2 + Math.sin(a) * 70); } g.closePath(); g.stroke();
  g.fillStyle = '#c8321e'; g.beginPath(); g.arc(w / 2, h / 2, 14, 0, 7); g.fill();
}, 256, 256);
const doorTex = makeTex((g, w, h) => {
  grain(g, w, h, '#8a5a36', .12, 4000);
  g.strokeStyle = 'rgba(40,20,10,.6)'; g.lineWidth = 4; for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  g.strokeStyle = '#2f9c95'; g.lineWidth = 10; g.beginPath(); g.arc(w, h / 2, 70, 0, 7); g.stroke();
  g.fillStyle = '#d9b45a'; for (let y = 30; y < h; y += 60) for (let x = 20; x < w; x += 60) { g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); }
}, 256, 256);
const plaqueTex = n => makeTex((g, w, h) => { g.fillStyle = '#f6e7d2'; g.fillRect(0, 0, w, h); g.strokeStyle = '#2f9c95'; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12); g.fillStyle = '#7a3a1f'; g.font = '30px Impact'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(n, w / 2, h / 2); }, 256, 64);

export const M5 = {
  rock: lam({ map: rockTex }), cracked: lam({ map: crackTex }), floor: lam({ map: floorTex }), top: lam({ color: 0xc8714a }),
  cliff: lam({ color: 0xd98b5f }), cliffDark: lam({ color: 0xb8623e }), wood: lam({ color: 0x8a5a36 }), door: lam({ map: doorTex }),
  robe: lam({ color: 0xf4ece0 }), sash: lam({ color: 0xc8321e }), skin: lam({ color: 0xb98a62 }), turq: lam({ color: TURQ }),
  sand: lam({ color: 0xe8c48e }), sigil: lam({ map: sigilTex }), metal: lam({ color: 0x6b6d62 }),
};
export const wallMats5 = [M5.rock, M5.rock, M5.top, M5.rock, M5.rock, M5.rock];

// wind dams: sandstone walls holding back a reservoir of sand that pours down a spillway
export function makeDam(L, c, r, idx) {
  const name = TARGET_NAMES[idx], x = c * S + S / 2, z = r * S + S / 2, g = new THREE.Group(); g.position.set(x, 0, z);
  const base = new THREE.Mesh(box(2.8, 3, 2.8), M5.rock); base.position.y = 1.5; base.castShadow = base.receiveShadow = true; g.add(base); L.statics.push(base);
  const parts = [];
  for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(box(.5, 3.2, .3), M5.wood); p.position.set(-1 + i, 1.6, 1.45); g.add(p); parts.push(p); }
  const crown = new THREE.Mesh(box(3.2, .6, 3.2), M5.top); crown.position.y = 3.3; g.add(crown); parts.push(crown);
  const res = new THREE.Mesh(new THREE.SphereGeometry(1.5, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), M5.sand); res.position.y = 3.6; res.scale.y = .5; g.add(res); parts.push(res);
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(2.2, .55), lam({ map: plaqueTex(name) })); plaque.position.set(0, .5, 1.42); g.add(plaque);
  const fallGeo = new THREE.BufferGeometry(), pts = new Float32Array(160 * 3);
  for (let i = 0; i < 160; i++) { pts[i * 3] = (Math.random() - .5) * 1.2; pts[i * 3 + 1] = Math.random() * 3.6; pts[i * 3 + 2] = 1.6 + Math.random() * .3; }
  fallGeo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  const fall = new THREE.Points(fallGeo, new THREE.PointsMaterial({ color: 0xe0b77a, size: .1 })); g.add(fall); parts.push(fall);
  const pile = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), M5.sand); pile.position.set(0, 0, 2); pile.scale.set(1.2, .35, .8); g.add(pile);
  const light = new THREE.PointLight(0xffc48a, 10, 10, 1.6); light.position.set(0, 3.5, 2); g.add(light);
  L.group.add(g);
  L.targets.push({ idx, name, x, z, c, r, planted: false, g, base, led: null, parts, fall, pile, light, broken: false });
}
export function breakDam(t) { t.broken = true; t.parts.forEach(p => p.visible = false); t.light.intensity = 0; t.pile.scale.set(2.6, .9, 2.6); t.base.scale.y = .45; t.base.position.y = .7; }

export function makeTempleGate(L, cx, cz) {
  const m = new THREE.Mesh(box(S, WH, .7), [M5.wood, M5.wood, M5.wood, M5.wood, M5.door, M5.door]);
  m.position.set(cx, WH / 2, cz); m.castShadow = true; L.group.add(m); L.statics.push(m); L.gateMeshes.push(m);
}

function monk(sitting = true) {
  const g = new THREE.Group();
  const robe = new THREE.Mesh(new THREE.ConeGeometry(.55, sitting ? .9 : 1.7, 10), M5.robe); robe.position.y = sitting ? .45 : .85; g.add(robe);
  const sash = new THREE.Mesh(new THREE.TorusGeometry(.32, .05, 6, 16), M5.sash); sash.rotation.x = Math.PI / 2; sash.position.y = sitting ? .62 : 1.2; g.add(sash);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.2, 10, 8), M5.skin); head.position.y = sitting ? 1.05 : 1.85; g.add(head);
  const hood = new THREE.Mesh(new THREE.SphereGeometry(.24, 10, 8, 0, Math.PI * 2, 0, Math.PI / 1.7), M5.robe); hood.position.y = sitting ? 1.08 : 1.88; g.add(hood);
  return g;
}

export function decorateSarrat(L) {
  seed = 83;
  const A = L.anim = { flags: [], vanes: [], storm: null, abbess: null, sigils: [] };
  const add = o => (L.group.add(o), o);
  // cracked walls the sledge can open
  L.cracked = {}; L.crackedCount = 0;
  const crackGeo = box(S, WH + .3, S);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (ch(c, r) === 'w') {
    const m = new THREE.Mesh(crackGeo, [M5.cracked, M5.cracked, M5.top, M5.cracked, M5.cracked, M5.cracked]);
    m.position.set(c * S + S / 2, (WH + .3) / 2, r * S + S / 2); m.castShadow = m.receiveShadow = true; add(m); L.statics.push(m);
    L.cracked[r * COLS + c] = m; L.crackedCount++;
  }
  // rough rock crowning the walls, so the monastery reads as carved from the canyon
  const dodec = new THREE.DodecahedronGeometry(1, 0);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (ch(c, r) !== '#' || ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => open(c + a, r + b))) continue;
    if (rnd() < .55) { const m = new THREE.Mesh(dodec, rnd() < .5 ? M5.cliff : M5.cliffDark); const s = 1.4 + rnd() * 1.4; m.scale.set(s, s * (.6 + rnd()), s); m.position.set(c * S + S / 2, WH + .3 + s * .4, r * S + S / 2); m.rotation.set(rnd(), rnd() * 3, rnd()); m.castShadow = true; add(m); }
    // wind towers with turning vanes
    if (rnd() < .07) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.2, 5, 8), M5.rock); t.position.set(c * S + S / 2, WH + 2.8, r * S + S / 2); t.castShadow = true; add(t);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(1.3, 1.2, 8), M5.turq); cap.position.set(t.position.x, WH + 5.9, t.position.z); add(cap);
      const vane = new THREE.Group(); vane.position.set(t.position.x, WH + 4.6, t.position.z + 1.25); add(vane);
      for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(box(.25, 1.8, .05), M5.robe); b.rotation.z = i * Math.PI / 2; b.position.set(Math.sin(i * Math.PI / 2) * .9, Math.cos(i * Math.PI / 2) * .9, 0); vane.add(b); }
      A.vanes.push(vane);
    }
  }
  // prayer flags strung across open rows
  const flagCols = [0xc8321e, 0xf2b51c, TURQ, 0xf4ece0, 0x3f7f9a];
  for (let r = 3; r < ROWS - 2; r += 2 + Math.floor(rnd() * 2)) {
    let c0 = -1;
    for (let c = 1; c < COLS; c++) {
      if (open(c, r) && c0 < 0) c0 = c;
      if ((!open(c, r) || c === COLS - 1) && c0 >= 0) {
        const c1 = c - 1;
        if (c1 - c0 >= 3 && rnd() < .7) {
          const x0 = c0 * S + .3, x1 = (c1 + 1) * S - .3, z = r * S + S / 2 + (rnd() - .5) * 2, y = 3.6;
          const line = new THREE.Mesh(new THREE.CylinderGeometry(.015, .015, x1 - x0, 3), M5.metal); line.rotation.z = Math.PI / 2; line.position.set((x0 + x1) / 2, y, z); add(line);
          for (let x = x0 + .4; x < x1 - .2; x += .7) {
            const f = new THREE.Mesh(new THREE.PlaneGeometry(.45, .55), basic({ color: flagCols[Math.floor(rnd() * flagCols.length)], side: THREE.DoubleSide }));
            const k = (x - x0) / (x1 - x0); f.position.set(x, y - .3 - Math.sin(k * Math.PI) * .5, z); add(f); A.flags.push({ f, ph: rnd() * 6 });
          }
        }
        c0 = -1;
      }
    }
  }
  // seated monk statues in the alcoves next to walls
  for (let r = 1; r < ROWS - 1; r++) for (let c = 1; c < COLS - 1; c++) {
    if (ch(c, r) !== '.' || rnd() > .06) continue;
    const walls = [[0, -1], [0, 1], [-1, 0], [1, 0]].filter(([a, b]) => ch(c + a, r + b) === '#'); if (!walls.length) continue;
    const [dc, dr] = walls[0], m = monk(); m.position.set(c * S + S / 2 + dc * 1.3, 0, r * S + S / 2 + dr * 1.3); m.rotation.y = Math.atan2(-dc, -dr);
    m.traverse(o => { if (o.material === M5.robe) o.material = M5.rock; }); add(m); W.obstacles.push({ x: m.position.x, z: m.position.z, r: .6, dead: false });
  }
  // the sanctum: sigil floor, lanterns, and the Abbess waiting
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (ch(c, r) === 'X') {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(S, S), M5.sigil); s.rotation.x = -Math.PI / 2; s.position.set(c * S + S / 2, .02, r * S + S / 2); add(s); A.sigils.push(s);
  }
  const ab = monk(false); ab.position.set(11 * S, 0, 1.3 * S); ab.traverse(o => { if (o.material === M5.sash) o.material = M5.turq; }); add(ab); A.abbess = ab;
  for (const dx of [-1, 1]) { const l = new THREE.PointLight(0xffc48a, 14, 10, 1.5); l.position.set(11 * S + dx * 6, 2.5, 1.5 * S); add(l); }
  // the canyon: sheer red cliffs all round
  for (let i = 0; i < 28; i++) {
    const a = i / 28 * Math.PI * 2, d = 70 + rnd() * 12, h = 30 + rnd() * 40;
    if (Math.sin(a) > .9) continue; // leave the canyon road open to the south
    const cl = new THREE.Mesh(box(26 + rnd() * 14, h, 18 + rnd() * 10), rnd() < .5 ? M5.cliff : M5.cliffDark);
    cl.position.set(COLS * S / 2 + Math.cos(a) * d, h / 2 - 1, ROWS * S / 2 + Math.sin(a) * d); cl.rotation.y = -a + Math.PI / 2 + (rnd() - .5) * .3; add(cl);
  }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), lam({ color: 0xe6b98e })); ground.rotation.x = -Math.PI / 2; ground.position.set(COLS * S / 2, -.03, ROWS * S / 2); add(ground);
  // sandstorm particles, kept in a box around Daniel
  const sg = new THREE.BufferGeometry(), sp = new Float32Array(900 * 3);
  for (let i = 0; i < 900; i++) { sp[i * 3] = (rnd() - .5) * 40; sp[i * 3 + 1] = rnd() * 6; sp[i * 3 + 2] = (rnd() - .5) * 40; }
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  A.storm = add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xd9a46e, size: .12, transparent: true, opacity: 0, depthWrite: false })));
  A.update = (dt, t, P, G) => {
    const k = G.stormK || 0, wx = G.windX || 1, wz = G.windZ || 0;
    for (const f of A.flags) f.f.rotation.y = Math.sin(t * (2 + k * 8) + f.ph) * (.3 + k * .6) + Math.atan2(wx, wz) * k * .3;
    for (const v of A.vanes) v.rotation.z += dt * (.6 + k * 5);
    A.storm.material.opacity = k * .9; A.storm.position.set(P.x, 0, P.z);
    if (k > .02) {
      const p = A.storm.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        let x = p.getX(i) + wx * dt * 18, z = p.getZ(i) + wz * dt * 18;
        if (x > 20) x -= 40; if (x < -20) x += 40; if (z > 20) z -= 40; if (z < -20) z += 40;
        p.setX(i, x); p.setZ(i, z); p.setY(i, (p.getY(i) + dt * (.5 + Math.sin(i) * .5) + 6) % 6);
      }
      p.needsUpdate = true;
    }
    if (A.abbess) A.abbess.rotation.y = Math.atan2(P.x - A.abbess.position.x, P.z - A.abbess.position.z) * .3;
  };
}
