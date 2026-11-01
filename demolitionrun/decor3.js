import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { MAP, S, WH, ROWS, COLS, TARGET_NAMES, makeTex, grain } from './core.js';

// Level 3 dressing: Ulm-Saphar as Reshman remembers it, brushed in ink on rice paper.
const ch = (c, r) => (MAP[r] || '')[c] || '#';
const open = (c, r) => !'#BTDJULQ'.includes(ch(c, r));
let seed = 41; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const lam = o => new THREE.MeshLambertMaterial(o), basic = o => new THREE.MeshBasicMaterial(o);
const INK = 0x1d1b16, SEAL = 0xc8321e;

function brush(g, w, h, n = 6, alpha = .5) {
  g.strokeStyle = `rgba(29,27,22,${alpha})`; g.lineCap = 'round';
  for (let i = 0; i < n; i++) { g.lineWidth = 2 + Math.random() * 8; g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (Math.random() - .5) * 90; y += (Math.random() - .5) * 40; g.lineTo(x, y); } g.stroke(); }
}
const paperTex = makeTex((g, w, h) => {
  grain(g, w, h, '#f4eee1', .035, 4000);
  g.strokeStyle = 'rgba(29,27,22,.85)'; g.lineWidth = 7; g.beginPath(); g.moveTo(0, h - 6); g.lineTo(w, h - 9); g.stroke();
  g.lineWidth = 3; g.beginPath(); g.moveTo(4, 0); g.lineTo(6, h); g.stroke();
  brush(g, w, h, 3, .18);
  if (Math.random() < .5) { g.fillStyle = '#c8321e'; g.fillRect(w * .7, h * .2, 26, 26); g.fillStyle = '#f4eee1'; g.fillRect(w * .7 + 6, h * .2 + 6, 14, 3); g.fillRect(w * .7 + 6, h * .2 + 14, 14, 3); }
  g.fillStyle = 'rgba(29,27,22,.8)'; for (let i = 0; i < 3; i++) g.fillRect(w * .3 + i * 24, h * .35, 14, 30 + Math.random() * 30);
});
const floorTex = makeTex((g, w, h) => { grain(g, w, h, '#ede6d6', .04, 3000); brush(g, w, h, 2, .12); g.strokeStyle = 'rgba(29,27,22,.25)'; g.lineWidth = 2; g.strokeRect(2, 2, w - 4, h - 4); g.fillStyle = 'rgba(200,50,30,.5)'; for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 5, 3, Math.random() * 3, 0, 7); g.fill(); } }, 256, 256, COLS, ROWS);
const screenTex = makeTex((g, w, h) => { g.fillStyle = '#f7f0e1'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1d1b16'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6); g.lineWidth = 3; for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(i * w / 4, 0); g.lineTo(i * w / 4, h); g.stroke(); } for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(0, i * h / 5); g.lineTo(w, i * h / 5); g.stroke(); } brush(g, w, h, 2, .5); });
const ensoTex = makeTex((g, w, h) => {
  g.fillStyle = '#f4eee1'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#1d1b16'; g.lineCap = 'round'; for (let i = 0; i < 6; i++) { g.lineWidth = 26 - i * 3; g.beginPath(); g.arc(w / 2, h / 2, 95 + i, .3 + i * .02, Math.PI * 1.85); g.stroke(); }
  g.fillStyle = '#c8321e'; g.fillRect(w / 2 - 22, h / 2 - 22, 44, 44);
}, 1024, 256);
function labelTex(text, color = '#1d1b16') { return makeTex((g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = color; g.font = '64px Impact'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2); }, 512, 128); }
function letterTex(name) { return makeTex((g, w, h) => { g.fillStyle = '#f7f0e1'; g.fillRect(0, 0, w, h); g.fillStyle = '#1d1b16'; g.font = '26px Impact'; g.textAlign = 'center'; name.split(' ').forEach((s, i) => g.fillText(s, w / 2, 70 + i * 34)); g.fillStyle = '#c8321e'; g.fillRect(w / 2 - 16, h - 60, 32, 32); }, 192, 256); }

export const M3 = {
  paper: lam({ map: paperTex }), floor: lam({ map: floorTex }), roof: lam({ color: 0x2b2a27 }), ink: lam({ color: INK }), seal: lam({ color: SEAL }),
  screen: lam({ map: screenTex }), stone: lam({ color: 0xd8d0bf }), lantern: basic({ color: 0xffd9b0 }), lanternRed: basic({ color: 0xe0563e }),
  dune: lam({ color: 0xe6cf9e }), well: basic({ color: 0x111010 }), gold: lam({ color: 0xf2b51c, emissive: 0x5a3a00 }),
};
export const wallMats3 = [M3.paper, M3.paper, M3.roof, M3.paper, M3.paper, M3.paper];

export function makeShrine(L, c, r, idx) {
  const name = TARGET_NAMES[idx], x = c * S + S / 2, z = r * S + S / 2, g = new THREE.Group(); g.position.set(x, 0, z);
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.4, 2.8), M3.stone); base.position.y = .7; base.castShadow = base.receiveShadow = true; g.add(base); L.statics.push(base);
  const parts = [];
  for (let i = 0; i < 3; i++) {
    const s = 1.6 - i * .35, tier = new THREE.Mesh(new THREE.BoxGeometry(s, .9, s), i % 2 ? M3.screen : M3.paper); tier.position.y = 1.85 + i * 1.3; g.add(tier); parts.push(tier);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(s * .95, .5, 4), M3.roof); roof.rotation.y = Math.PI / 4; roof.position.y = 2.55 + i * 1.3; g.add(roof); parts.push(roof);
  }
  const glow = new THREE.Mesh(new THREE.SphereGeometry(.38, 14, 10), M3.lanternRed); glow.position.y = 6.1; g.add(glow); parts.push(glow);
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(.9, 1.2), lam({ map: letterTex(name), side: THREE.DoubleSide })); tag.position.set(0, 1.05, 1.42); g.add(tag); parts.push(tag);
  const light = new THREE.PointLight(0xffb37a, 18, 14, 1.5); light.position.y = 5; g.add(light);
  L.group.add(g);
  L.targets.push({ idx, name, x, z, c, r, planted: false, g, base, led: null, parts, ring: parts[5], gem: glow, light, broken: false });
}

export function makeInkGate(L, cx, cz, i) {
  const t = ensoTex.clone(); t.repeat.set(.25, 1); t.offset.set(i * .25, 0); t.needsUpdate = true;
  const face = lam({ map: t });
  const m = new THREE.Mesh(new THREE.BoxGeometry(S, WH, .8), [M3.ink, M3.ink, M3.ink, M3.ink, face, face]);
  m.position.set(cx, WH / 2, cz); m.castShadow = true; L.group.add(m); L.statics.push(m); L.gateMeshes.push(m);
}

export function decorateMemory(L) {
  seed = 41;
  const A = L.anim = { lanterns: [], wells: [], dunes: [], rise: null, altars: {}, petals: null, shrineLights: [] };
  const add = o => (L.group.add(o), o);
  // tiered ink rooftops over every exposed wall: the city skyline
  const cone = new THREE.ConeGeometry(1, 1, 4);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (ch(c, r) !== '#' || ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => ch(c + a, r + b) !== '#')) continue;
    const x = c * S + S / 2, z = r * S + S / 2, tiers = rnd() < .12 ? 3 : rnd() < .5 ? 1 : 2;
    let y = WH + .3;
    for (let i = 0; i < tiers; i++) {
      const w = 3.4 - i * .7;
      if (i > 0) { const body = new THREE.Mesh(new THREE.BoxGeometry(w * .8, 1.4, w * .8), M3.paper); body.position.set(x, y + .7, z); body.castShadow = true; add(body); y += 1.4; }
      const roof = new THREE.Mesh(cone, M3.roof); roof.scale.set(w * 1.05, .9, w * 1.05); roof.rotation.y = Math.PI / 4; roof.position.set(x, y + .45, z); roof.castShadow = true; add(roof); y += .5;
    }
    if (rnd() < .06) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 3, 5), M3.ink); pole.position.set(x, y + 1.5, z); add(pole); const flag = new THREE.Mesh(new THREE.PlaneGeometry(.9, 1.6), M3.seal); flag.position.set(x + .45, y + 2.2, z); add(flag); }
  }
  // paper screens instead of crates
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (ch(c, r) === 'B') {
    const g = new THREE.Group(); g.position.set(c * S + S / 2, 0, r * S + S / 2); g.rotation.y = rnd() * 3;
    for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.4, .08), M3.screen); p.position.set(-1.1 + i * 1.1, 1.2, (i % 2) * .4); p.rotation.y = (i % 2 ? .5 : -.5); p.castShadow = true; g.add(p); L.statics.push(p); }
    add(g);
  }
  // lanterns strung across the streets
  let nl = 0;
  for (let r = 1; r < ROWS - 1; r++) for (let c = 1; c < COLS - 1; c++) {
    if (!open(c, r) || r > 13 || rnd() > .22) continue;
    const x = c * S + S / 2 + (rnd() - .5) * 2, z = r * S + S / 2 + (rnd() - .5) * 2, y = 3.2 + rnd() * 1.2;
    const string = new THREE.Mesh(new THREE.CylinderGeometry(.01, .01, 3, 3), M3.ink); string.position.set(x, y + 1.5, z); add(string);
    const lan = new THREE.Mesh(new THREE.SphereGeometry(.32, 12, 8), rnd() < .4 ? M3.lanternRed : M3.lantern); lan.scale.y = 1.3; lan.position.set(x, y, z); add(lan);
    let light = null; if (nl++ < 9 && rnd() < .7) { light = new THREE.PointLight(0xffc89a, 10, 10, 1.6); light.position.set(x, y, z); add(light); }
    A.lanterns.push({ m: lan, s: string, light, x, y, z, ph: rnd() * 6 });
  }
  // ink wells: Shades crawl out of these until you seal them
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (ch(c, r) === 'J') {
    const g = new THREE.Group(); g.position.set(c * S + S / 2, 0, r * S + S / 2);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.2, .25, 8, 24), M3.stone); rim.rotation.x = Math.PI / 2; rim.position.y = .2; g.add(rim);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(1.15, 24), M3.well); pool.rotation.x = -Math.PI / 2; pool.position.y = .3; g.add(pool);
    const tendrils = [];
    for (let i = 0; i < 5; i++) { const t = new THREE.Mesh(new THREE.ConeGeometry(.16, 1.6 + rnd(), 5), M3.ink); t.position.set(Math.cos(i * 1.26) * .6, 1, Math.sin(i * 1.26) * .6); g.add(t); tendrils.push(t); }
    add(g);
    const well = { g, pool, tendrils, rim, x: g.position.x, z: g.position.z, hp: 140, alive: true, spawnT: 8 + rnd() * 10 };
    [rim, pool, ...tendrils].forEach(m => { m.userData.well = well; L.hitList.push(m); });
    A.wells.push(well); L.wells = A.wells;
  }
  // the two altars at the heart: break the mask, or wear it
  for (const [key, label, color] of [['X', 'BREAK', '#c8321e'], ['Z', 'WEAR', '#b8860b']]) {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (ch(c, r) === key) {
      const x = c * S + S / 2, z = r * S + S / 2, g = new THREE.Group(); g.position.set(x, 0, z);
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(.7, .9, 1.1, 8), M3.stone); ped.position.y = .55; g.add(ped);
      const mask = new THREE.Group(); mask.position.y = 1.7; g.add(mask);
      const hood = new THREE.Mesh(new THREE.SphereGeometry(.36, 14, 10), M3.ink); hood.scale.set(1, 1.15, .9); mask.add(hood);
      const band = new THREE.Mesh(new THREE.TorusGeometry(.36, .045, 6, 20), M3.seal); band.rotation.x = Math.PI / 2; band.position.y = .1; mask.add(band);
      const halo = new THREE.Mesh(new THREE.TorusGeometry(.75, .04, 6, 32), key === 'X' ? M3.seal : M3.gold); halo.position.y = 1.7; g.add(halo);
      const word = new THREE.Mesh(new THREE.PlaneGeometry(3, .75), basic({ map: labelTex(label, color), transparent: true })); word.rotation.x = -Math.PI / 2; word.position.set(0, .03, -1.6); g.add(word);
      const light = new THREE.PointLight(key === 'X' ? 0xff6a4a : 0xffd27a, 0, 9, 1.5); light.position.y = 2.4; g.add(light);
      add(g); A.altars[key] = { g, mask, halo, light };
    }
  }
  // inverted dunes drifting in the sky, sand falling upward into them
  for (let i = 0; i < 9; i++) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(10 + rnd() * 16, 16, 8), M3.dune); d.scale.y = .25;
    d.position.set(COLS * S / 2 + (rnd() - .5) * 160, 38 + rnd() * 28, ROWS * S / 2 + (rnd() - .5) * 150); d.rotation.z = Math.PI; add(d); A.dunes.push({ m: d, y: d.position.y, ph: rnd() * 6 });
  }
  const pg = new THREE.BufferGeometry(), pts = new Float32Array(500 * 3);
  for (let i = 0; i < 500; i++) { pts[i * 3] = rnd() * COLS * S; pts[i * 3 + 1] = rnd() * 40; pts[i * 3 + 2] = rnd() * ROWS * S; }
  pg.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  A.rise = add(new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xc9a86a, size: .08 })));
  // a great brushed sun ring on the horizon
  const sunRing = new THREE.Mesh(new THREE.RingGeometry(26, 30, 48), basic({ color: SEAL, side: THREE.DoubleSide, fog: false }));
  sunRing.position.set(COLS * S / 2, 40, -120); add(sunRing);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), lam({ color: 0xece4d2 })); ground.rotation.x = -Math.PI / 2; ground.position.set(COLS * S / 2, -.03, ROWS * S / 2); add(ground);
  A.update = (dt, t, P, G) => {
    for (const l of A.lanterns) { const sw = Math.sin(t * .9 + l.ph) * .12; l.m.position.x = l.x + sw; if (l.light) l.light.intensity = 10 + Math.sin(t * 7 + l.ph) * 1.5; }
    for (const d of A.dunes) { d.m.position.y = d.y + Math.sin(t * .2 + d.ph) * 2; d.m.rotation.y += dt * .02; }
    const p = A.rise.geometry.attributes.position; for (let i = 0; i < p.count; i++) { let y = p.getY(i) + dt * 1.6; if (y > 40) y = 0; p.setY(i, y); } p.needsUpdate = true;
    for (const w of A.wells) if (w.alive) w.tendrils.forEach((tn, i) => { tn.scale.y = 1 + Math.sin(t * 3 + i) * .25; tn.rotation.z = Math.sin(t * 2 + i) * .25; });
    for (const tg of L.targets) if (!tg.broken) tg.gem.scale.setScalar(1 + Math.sin(t * 3 + tg.idx) * .12);
    for (const k in A.altars) { const a = A.altars[k]; a.mask.rotation.y = Math.sin(t * .6) * .5; a.halo.rotation.y += dt; a.light.intensity = G.heartDown ? 18 + Math.sin(t * 4) * 4 : 0; }
  };
}

export function breakShrine(t) { t.broken = true; t.parts.forEach(p => p.visible = false); t.light.intensity = 0; }
export function sealWell(w) { w.alive = false; w.tendrils.forEach(t => t.visible = false); w.pool.material = M3.stone; }
