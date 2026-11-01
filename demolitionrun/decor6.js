import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { MAP, S, WH, ROWS, COLS, TARGET_NAMES, makeTex, grain } from './core.js';
import { enemyRecord, exclTex, MAT } from './level.js';

// Level 6 dressing: the Glass Coast. A thousand years ago someone lit this beach to stop the song following them inland.
const ch = (c, r) => (MAP[r] || '')[c] || '#';
const open = (c, r) => !'#BTDLwK'.includes(ch(c, r));
let seed = 61; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const lam = o => new THREE.MeshLambertMaterial(o), basic = o => new THREE.MeshBasicMaterial(o);
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const SEA = 0x1f6f78, AQUA = 0x9feef4;

function blocks(g, w, h, base) {
  grain(g, w, h, base, .06, 4000);
  g.strokeStyle = 'rgba(50,80,80,.35)'; g.lineWidth = 3;
  for (let y = 0; y < h; y += 64) {
    g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
    for (let x = (y / 64) % 2 ? 32 : 0; x < w; x += 64) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 64); g.stroke(); }
  }
  // sea-glass weeping out of the mortar
  g.fillStyle = 'rgba(31,111,120,.2)'; g.fillRect(0, h * .8, w, h * .2);
  for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(${150 + Math.random() * 50 | 0},${220 + Math.random() * 35 | 0},${215 + Math.random() * 40 | 0},.75)`; g.beginPath(); g.arc(Math.random() * w, h * .55 + Math.random() * h * .45, 2 + Math.random() * 4, 0, 7); g.fill(); }
}
const wallTex = makeTex((g, w, h) => blocks(g, w, h, '#d9d4c4'));
const crackTex = makeTex((g, w, h) => {
  blocks(g, w, h, '#d2cbb8');
  g.strokeStyle = 'rgba(30,40,40,.8)'; g.lineCap = 'round';
  for (let i = 0; i < 7; i++) { g.lineWidth = 2 + Math.random() * 4; g.beginPath(); let x = w / 2, y = h / 2; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (Math.random() - .5) * 70; y += (Math.random() - .5) * 70; g.lineTo(x, y); } g.stroke(); }
  // Mira's mark: the same chalk hammer the Order's masons used
  g.strokeStyle = 'rgba(255,250,240,.9)'; g.lineWidth = 6; g.beginPath(); g.moveTo(w * .35, h * .78); g.lineTo(w * .62, h * .5); g.stroke();
  g.fillStyle = 'rgba(255,250,240,.9)'; g.save(); g.translate(w * .64, h * .48); g.rotate(-.78); g.fillRect(-22, -12, 44, 24); g.restore();
});
const floorTex = makeTex((g, w, h) => {
  grain(g, w, h, '#e3d6ba', .05, 5000);
  g.strokeStyle = 'rgba(120,110,90,.18)'; g.lineWidth = 2;
  for (let i = 0; i < 5; i++) { g.beginPath(); const y = 30 + i * 48 + Math.random() * 10; g.moveTo(0, y); for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x / 30 + i) * 5); g.stroke(); }
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${140 + Math.random() * 60 | 0},230,225,.8)`; g.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
}, 256, 256, COLS, ROWS);
const stripeTex = makeTex((g, w, h) => { for (let y = 0; y < h; y += 64) { g.fillStyle = (y / 64) % 2 ? '#f4efe3' : '#b8402a'; g.fillRect(0, y, w, 64); } grain(g, w, h, 'rgba(0,0,0,0)', .05, 2000); }, 128, 256);
const plaqueTex = n => makeTex((g, w, h) => { g.fillStyle = '#e8f3f1'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1f6f78'; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12); g.fillStyle = '#1f4f55'; g.font = '30px Impact'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(n, w / 2, h / 2); }, 256, 64);
const labelTex = (text, color) => makeTex((g, w, h) => { g.font = '84px Impact'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = color; g.fillText(text, w / 2, h / 2); }, 512, 128);

export const M6 = {
  wall: lam({ map: wallTex }), cracked: lam({ map: crackTex }), floor: lam({ map: floorTex }), top: lam({ color: 0xa9c4bd }),
  glass: lam({ color: 0xd6f3f8, emissive: 0x1a4e5a, transparent: true, opacity: .72 }), glassHard: lam({ color: 0xbfe6e0, emissive: 0x123c44 }),
  rust: lam({ color: 0x9e4a2a }), iron: lam({ color: 0x4a4f4c }), cream: lam({ color: 0xf4efe3 }), stripe: lam({ map: stripeTex }),
  sea: lam({ color: SEA, emissive: 0x0a2a30 }), lamp: basic({ color: 0xffe08a }), gold: basic({ color: 0xf2b51c }),
};
export const wallMats6 = [M6.wall, M6.wall, M6.top, M6.wall, M6.wall, M6.wall];

// tide organs: glass pipes the sea sings up through
export function makeOrgan(L, c, r, idx) {
  const name = TARGET_NAMES[idx], x = c * S + S / 2, z = r * S + S / 2, g = new THREE.Group(); g.position.set(x, 0, z);
  const base = new THREE.Mesh(box(2.6, 1.2, 2.6), M6.wall); base.position.y = .6; base.castShadow = base.receiveShadow = true; g.add(base); L.statics.push(base);
  const pipes = [], stubs = [];
  for (let i = 0; i < 7; i++) {
    const a = -1.2 + i * .4, h = 2.2 + Math.sin(i * 1.3) * .8 + (3 - Math.abs(i - 3)) * .7, px = Math.sin(a) * .8, pz = Math.cos(a) * .3 - .2;
    const p = new THREE.Mesh(new THREE.CylinderGeometry(.16, .2, h, 8), M6.glass); p.position.set(px, 1.2 + h / 2, pz); g.add(p); pipes.push(p);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(.19, .04, 6, 12), M6.gold); rim.rotation.x = Math.PI / 2; rim.position.set(px, 1.2 + h, pz); g.add(rim); pipes.push(rim);
    const s = new THREE.Mesh(new THREE.CylinderGeometry(.18, .2, .3, 8), M6.glassHard); s.position.set(px, 1.35, pz); s.rotation.z = (rnd() - .5) * .4; s.visible = false; g.add(s); stubs.push(s);
  }
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(2.2, .55), lam({ map: plaqueTex(name) })); plaque.position.set(0, .6, 1.32); g.add(plaque);
  const light = new THREE.PointLight(AQUA, 12, 10, 1.6); light.position.set(0, 3.5, 0); g.add(light);
  L.group.add(g);
  L.targets.push({ idx, name, x, z, c, r, planted: false, g, base, led: null, pipes, stubs, light, broken: false });
}
export function breakOrgan(t) { t.broken = true; t.pipes.forEach(p => p.visible = false); t.stubs.forEach(s => s.visible = true); t.light.intensity = 0; }

// the sluice gate down to the beach: rusted iron, Watch stencils
export function makeSluice(L, cx, cz) {
  const m = new THREE.Mesh(box(S, WH, .7), [M6.iron, M6.iron, M6.rust, M6.iron, M6.rust, M6.rust]);
  m.position.set(cx, WH / 2, cz); m.castShadow = true; L.group.add(m); L.statics.push(m); L.gateMeshes.push(m);
}

// The Deep Choir: the oldest singer, rising out of the surf. Shaped like the First Note's heart so the same fight logic drives it.
export function makeDeep(L, x, z, name) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(1.3);
  const glass = lam({ color: 0xd6f3f8, emissive: 0x1a4e5a, transparent: true, opacity: .7 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.7, 2.6, 2.6, 10, 1, true), glass); body.position.y = 1.2; g.add(body);
  const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(1.7, 0), glass); shell.position.y = 3; g.add(shell);
  for (let i = 0; i < 9; i++) { // a crown of glass spines
    const sp = new THREE.Mesh(new THREE.ConeGeometry(.22, 1.6 + (i % 3) * .5, 5), glass), a = i / 9 * Math.PI * 2;
    sp.position.set(Math.cos(a) * 1.4, .4 + (i % 2) * .5, Math.sin(a) * 1.4); sp.lookAt(Math.cos(a) * 4, 2.5, Math.sin(a) * 4); sp.rotateX(Math.PI / 2); shell.add(sp);
  }
  const heart = new THREE.Mesh(new THREE.OctahedronGeometry(.6, 0), M6.gold); heart.position.y = 3; heart.userData.head = true; g.add(heart);
  const rings = [0, 1, 2].map(i => { const r = new THREE.Mesh(new THREE.TorusGeometry(2.4 + i * .5, .05, 6, 48), basic({ color: AQUA, transparent: true, opacity: .7 })); r.position.y = 3; g.add(r); return r; });
  const shards = [];
  for (let i = 0; i < 8; i++) { const s = new THREE.Mesh(new THREE.OctahedronGeometry(.3, 0), glass); s.scale.y = 2.5; g.add(s); shards.push(s); }
  const flash = new THREE.Mesh(box(.1, .1, .1), MAT.flash); flash.visible = false; g.add(flash);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: exclTex, fog: false })); sprite.visible = false; g.add(sprite);
  const light = new THREE.PointLight(AQUA, 30, 22, 1.4); light.position.y = 3; g.add(light);
  L.group.add(g);
  const parts = [body, shell, heart, ...shards];
  return enemyRecord(L, { kind: 'heart', boss: true, name, g, parts, uni: glass, glass, shell, heart, rings, shards, light, legL: new THREE.Group(), legR: new THREE.Group(), flash, sprite, x, z, hp: 1300, maxHp: 1300, baseEm: 0x1a4e5a, pulseT: 6, spawnT: 12 }, parts);
}

export function decorateCoast(L) {
  seed = 61;
  const A = L.anim = { altars: {}, beam: null, beamX: 12 * S, beamZ: 10 * S, lamp: null, sea: null, foam: [], spires: [], motes: null };
  const add = o => (L.group.add(o), o);
  // cracked walls hide the drowned chapels
  L.cracked = {}; L.crackedCount = 0;
  const crackGeo = box(S, WH + .3, S);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (ch(c, r) === 'w') {
    const m = new THREE.Mesh(crackGeo, [M6.cracked, M6.cracked, M6.top, M6.cracked, M6.cracked, M6.cracked]);
    m.position.set(c * S + S / 2, (WH + .3) / 2, r * S + S / 2); m.castShadow = m.receiveShadow = true; add(m); L.statics.push(m);
    L.cracked[r * COLS + c] = m; L.crackedCount++;
  }
  // the north wall is only a sea wall: knee height, so the beach looks straight out at the water
  for (const m of L.statics) if (m.geometry?.type === 'BoxGeometry' && Math.abs(m.position.z - S / 2) < .01 && m.position.x > S && m.position.x < (COLS - 1) * S) { m.scale.y = .28; m.position.y = (WH + .3) * .14; }
  // sea-glass growing out of the wall tops
  const oct = new THREE.OctahedronGeometry(1, 0);
  for (let r = 1; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (ch(c, r) !== '#' || ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => open(c + a, r + b)) || rnd() > .3) continue;
    const m = new THREE.Mesh(oct, rnd() < .6 ? M6.glass : M6.glassHard), s = .5 + rnd() * .9;
    m.scale.set(s * .6, s * (1.4 + rnd() * 1.6), s * .6); m.position.set(c * S + S / 2 + (rnd() - .5) * 2, WH + .3 + s, r * S + S / 2 + (rnd() - .5) * 2); m.rotation.set((rnd() - .5) * .8, rnd() * 3, (rnd() - .5) * .8); add(m);
  }
  // shards of the old fire scattered over the beach
  const shardG = new THREE.OctahedronGeometry(.12, 0);
  for (let i = 0; i < 160; i++) {
    const c = 1 + Math.floor(rnd() * (COLS - 2)), r = 1 + Math.floor(rnd() * (ROWS - 2)); if (!open(c, r)) continue;
    const m = new THREE.Mesh(shardG, M6.glassHard); m.position.set(c * S + rnd() * S, .05, r * S + rnd() * S); m.scale.set(1, .4, 1 + rnd() * 2); m.rotation.y = rnd() * 3; add(m);
  }
  // Lanternhold: the Watch lighthouse, still sweeping the beach for its new masters
  const lx = A.beamX, lz = A.beamZ;
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3.3, 18, 16), M6.stripe); tower.position.set(lx, 9, lz); tower.castShadow = true; add(tower); L.statics.push(tower);
  const gallery = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.3, .4, 16), M6.iron); gallery.position.set(lx, 18.2, lz); add(gallery);
  const lampRoom = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 2.6, 12), lam({ color: 0xfff4c8, emissive: 0xb8902a, transparent: true, opacity: .85 })); lampRoom.position.set(lx, 19.7, lz); add(lampRoom);
  const capM = new THREE.Mesh(new THREE.ConeGeometry(2.3, 1.8, 12), M6.rust); capM.position.set(lx, 21.9, lz); add(capM);
  const door = new THREE.Mesh(box(1.4, 2.4, .2), M6.iron); door.position.set(lx, 1.2, lz + 3.2); add(door);
  A.lamp = add(new THREE.PointLight(0xffe08a, 30, 40, 1.2)); A.lamp.position.set(lx, 19.7, lz);
  // the beam: a fan from the lamp down to the sand, and the patch of floor it lights
  const beam = new THREE.Group(); beam.position.set(lx, 0, lz); A.beam = add(beam);
  const W2 = 50 * Math.tan(.1), fan = new THREE.BufferGeometry(), floor = new THREE.BufferGeometry();
  fan.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 19.7, 0, -W2, 0, 50, W2, 0, 50]), 3));
  floor.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, .07, 3, -W2, .07, 50, W2, .07, 50]), 3));
  const beamMat = o => basic({ color: 0xffe08a, transparent: true, opacity: o, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  beam.add(new THREE.Mesh(fan, beamMat(.16)), new THREE.Mesh(floor, beamMat(.32)));
  // the two altars at the waterline: the last charge, or the shell to listen through
  for (const [key, label, color] of [['X', 'SILENCE', '#c8321e'], ['Z', 'ANSWER', '#1f6f78']]) {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (ch(c, r) === key) {
      const x = c * S + S / 2, z = r * S + S / 2, g = new THREE.Group(); g.position.set(x, 0, z);
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(.7, .9, 1.1, 8), M6.wall); ped.position.y = .55; g.add(ped);
      const item = new THREE.Group(); item.position.y = 1.5; g.add(item);
      if (key === 'X') { item.add(new THREE.Mesh(box(.6, .35, .4), MAT.c4)); const led = new THREE.Mesh(box(.08, .08, .08), MAT.led); led.position.y = .22; item.add(led); }
      else { const sh = new THREE.Mesh(new THREE.ConeGeometry(.32, .9, 12), M6.glass); sh.rotation.z = Math.PI / 2.4; item.add(sh); const lip = new THREE.Mesh(new THREE.TorusGeometry(.3, .07, 6, 16), M6.glassHard); lip.position.x = .36; lip.rotation.y = Math.PI / 2; item.add(lip); }
      const halo = new THREE.Mesh(new THREE.TorusGeometry(.75, .04, 6, 32), key === 'X' ? lam({ color: 0xc8321e }) : M6.gold); halo.position.y = 1.6; g.add(halo);
      const word = new THREE.Mesh(new THREE.PlaneGeometry(3, .75), basic({ map: labelTex(label, color), transparent: true })); word.rotation.x = -Math.PI / 2; word.position.set(0, .03, 1.6); g.add(word);
      const light = new THREE.PointLight(key === 'X' ? 0xff6a4a : AQUA, 0, 9, 1.5); light.position.y = 2.4; g.add(light);
      add(g); A.altars[key] = { g, mask: item, halo, light };
    }
  }
  // the sea, and the glass spires standing in it like the tops of drowned cathedrals
  A.sea = add(new THREE.Mesh(new THREE.PlaneGeometry(700, 320), M6.sea)); A.sea.rotation.x = -Math.PI / 2; A.sea.position.set(COLS * S / 2, -.25, -160);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(500, 260), lam({ color: 0xdccdb0 })); ground.rotation.x = -Math.PI / 2; ground.position.set(COLS * S / 2, -.03, 124); add(ground);
  for (let i = 0; i < 6; i++) { const f = new THREE.Mesh(box(260, .05, .5), basic({ color: 0xf4fbfa, transparent: true, opacity: .6 })); f.position.set(COLS * S / 2, -.15, -6 - i * 9); add(f); A.foam.push({ m: f, ph: i * 1.3 }); }
  for (let i = 0; i < 18; i++) {
    const h = 6 + rnd() * (i < 4 ? 50 : 22), m = new THREE.Mesh(oct, rnd() < .5 ? M6.glass : M6.glassHard);
    m.scale.set(1.5 + rnd() * 3, h, 1.5 + rnd() * 3); m.position.set(COLS * S / 2 + (rnd() - .5) * 220, h * .3, -14 - rnd() * 130); m.rotation.set((rnd() - .5) * .3, rnd() * 3, (rnd() - .5) * .3); add(m); A.spires.push(m);
  }
  // motes of song drifting up off the water
  const pg = new THREE.BufferGeometry(), pts = new Float32Array(500 * 3);
  for (let i = 0; i < 500; i++) { pts[i * 3] = rnd() * COLS * S; pts[i * 3 + 1] = rnd() * 14; pts[i * 3 + 2] = -30 + rnd() * (ROWS * S + 30); }
  pg.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  A.motes = add(new THREE.Points(pg, new THREE.PointsMaterial({ color: AQUA, size: .09, transparent: true, opacity: .7, depthWrite: false })));
  A.update = (dt, t, P, G) => {
    A.sea.position.y = -.25 + Math.sin(t * .5) * .08;
    for (const f of A.foam) { f.m.position.z = -4 - ((t * 1.6 + f.ph * 9) % 54); f.m.material.opacity = .6 * Math.min(1, -f.m.position.z / 10); }
    A.spires.forEach((s, i) => { s.material === M6.glass && (s.rotation.y += dt * .02 * (i % 2 ? 1 : -1)); });
    const p = A.motes.geometry.attributes.position; for (let i = 0; i < p.count; i++) { let y = p.getY(i) + dt * (.4 + (i % 5) * .15); if (y > 14) y = 0; p.setY(i, y); } p.needsUpdate = true;
    A.lamp.intensity = G.bossDown ? 4 : 26 + Math.sin(t * 3) * 4;
    for (const k in A.altars) { const a = A.altars[k]; a.mask.rotation.y += dt * .8; a.halo.rotation.y += dt; a.light.intensity = G.heartDown ? 18 + Math.sin(t * 4) * 4 : 0; }
    for (const tg of L.targets) if (!tg.broken) tg.light.intensity = 10 + Math.sin(t * 5 + tg.idx) * 4;
  };
}
