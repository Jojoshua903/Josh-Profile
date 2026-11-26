// Ridgeline decor: three themed zones, landmarks, sunset sky and aurora.
// Frost cliffs (outside) → Ice caverns (middle) → Overgrown temple (centre).
import { THREE, C, GRID, CX, MID, scene, rng, rayTargets, setBuildHook, sun, hemi, flake, zoneOf, disposeTree } from './world.js';

const lerp = (a, b, k) => a + (b - a) * k;
const canvasTex = (w, h, draw, srgb = true) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t;
};

/* ================= sky: late-afternoon sunset with an aurora ================= */
scene.background = canvasTex(4, 512, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h);
  [[0, '#2f4a8f'], [.35, '#6f7fc4'], [.58, '#e79bb0'], [.72, '#ffb77d'], [.82, '#ffd9a3'], [1, '#fff1dc']].forEach(([s, c]) => gr.addColorStop(s, c));
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});
sun.color.set(0xffc58f); sun.intensity = 2.4; sun.position.set(CX - 60, 72, CX + 30); // high enough to light the floor of the tall canyons
hemi.color.set(0xffe2cf); hemi.groundColor.set(0xa9bce8); hemi.intensity = 1.35;
{
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: flake, color: 0xffc070, blending: THREE.AdditiveBlending, fog: false, depthWrite: false, transparent: true, opacity: .9 }));
  glow.position.set(CX - 420, 120, CX + 200); glow.scale.set(160, 160, 1); scene.add(glow);
  const disc = new THREE.Sprite(new THREE.SpriteMaterial({ map: flake, color: 0xfff1d0, fog: false, depthWrite: false, transparent: true }));
  disc.position.copy(glow.position); disc.scale.set(46, 46, 1); scene.add(disc);
}
const auroraTex = canvasTex(256, 128, (g, w, h) => {
  const gr = g.createLinearGradient(0, h, 0, 0);
  gr.addColorStop(0, 'rgba(80,255,170,0)'); gr.addColorStop(.25, 'rgba(80,255,170,.85)'); gr.addColorStop(.6, 'rgba(90,200,255,.45)'); gr.addColorStop(1, 'rgba(180,120,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'destination-out';
  for (let x = 0; x < w; x += 3) { g.fillStyle = `rgba(0,0,0,${Math.random() * .6})`; g.fillRect(x, 0, 2, h); }
});
auroraTex.wrapS = THREE.RepeatWrapping;
const auroras = [0, 1, 2].map((k) => {
  const geo = new THREE.PlaneGeometry(520, 70, 64, 1);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: auroraTex, transparent: true, opacity: .33 - k * .07, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }));
  m.position.set(CX + 60 - k * 30, 150 + k * 22, CX - 260 + k * 40); m.rotation.y = .25 - k * .2; m.rotation.x = -.15;
  m.userData.base = geo.attributes.position.array.slice(); m.userData.k = k;
  scene.add(m); return m;
});

/* ================= materials & textures ================= */
const stoneTex = canvasTex(256, 448, (g, w, h) => {
  g.fillStyle = '#b8ab8a'; g.fillRect(0, 0, w, h);
  for (let row = 0, y = 0; y < h; row++, y += 56) {
    for (let x = (row % 2) * -40; x < w; x += 80) {
      const l = 62 + Math.random() * 14; g.fillStyle = `hsl(${40 + Math.random() * 12},${18 + Math.random() * 10}%,${l}%)`;
      g.fillRect(x + 3, y + 3, 74, 50);
    }
  }
  for (let i = 0; i < 26; i++) { const x = Math.random() * w, y = Math.random() < .5 ? Math.random() * 70 : h - Math.random() * 90, r = 14 + Math.random() * 30; const b = g.createRadialGradient(x, y, 0, x, y, r); b.addColorStop(0, 'rgba(70,120,50,.7)'); b.addColorStop(1, 'rgba(70,120,50,0)'); g.fillStyle = b; g.fillRect(x - r, y - r, r * 2, r * 2); }
});
const runeTex = canvasTex(256, 448, (g, w, h) => {
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#fff'; g.lineWidth = 5; g.lineCap = 'round'; g.shadowColor = '#fff'; g.shadowBlur = 10;
  const y0 = 196;
  g.strokeRect(14, y0, w - 28, 56);
  for (let x = 34; x < w - 30; x += 44) {
    g.beginPath(); const t = Math.floor(Math.random() * 4);
    if (t === 0) { g.arc(x, y0 + 28, 12, 0, Math.PI * 2); }
    else if (t === 1) { g.moveTo(x - 12, y0 + 42); g.lineTo(x, y0 + 12); g.lineTo(x + 12, y0 + 42); }
    else if (t === 2) { g.moveTo(x, y0 + 10); g.lineTo(x, y0 + 46); g.moveTo(x - 12, y0 + 28); g.lineTo(x + 12, y0 + 28); }
    else { g.moveTo(x - 12, y0 + 14); g.lineTo(x + 12, y0 + 42); g.moveTo(x + 12, y0 + 14); g.lineTo(x - 12, y0 + 42); }
    g.stroke();
  }
}, false);
const paveTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#9c927a'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 64) { g.fillStyle = `hsl(${38 + Math.random() * 14},${14 + Math.random() * 8}%,${54 + Math.random() * 10}%)`; g.fillRect(x + 3, y + 3, 58, 58); }
  for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(80,130,60,.35)'; g.fillRect(Math.random() * w, Math.random() * h, 6 + Math.random() * 10, 3); }
});
paveTex.wrapS = paveTex.wrapT = THREE.RepeatWrapping; paveTex.repeat.set(9, 9);

const M = {
  rock: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .95, flatShading: true }),
  core: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }),
  snow: new THREE.MeshStandardMaterial({ color: 0xfbfdff, roughness: .6, flatShading: true }),
  ice: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .12, metalness: .08, flatShading: true, emissive: 0x1d6a9e, emissiveIntensity: .35 }),
  frost: new THREE.MeshStandardMaterial({ color: 0xe6f6ff, roughness: .35, flatShading: true }),
  temple: new THREE.MeshStandardMaterial({ map: stoneTex, emissiveMap: runeTex, emissive: 0x4dffd2, emissiveIntensity: .9, roughness: .9 }),
  moss: new THREE.MeshStandardMaterial({ color: 0x5f8f3e, roughness: 1, flatShading: true }),
  vine: new THREE.MeshStandardMaterial({ color: 0x3f7a35, roughness: 1, side: THREE.DoubleSide }),
  wood: new THREE.MeshStandardMaterial({ color: 0x7a5232, roughness: .9, flatShading: true }),
  crystal: new THREE.MeshStandardMaterial({ color: 0xbff4ff, emissive: 0x3fd4ff, emissiveIntensity: 1.3, roughness: .1, flatShading: true }),
  iceFloor: new THREE.MeshStandardMaterial({ color: 0xd9efff, roughness: .25, metalness: .05 }),
  pave: new THREE.MeshStandardMaterial({ map: paveTex, roughness: .95 }),
  pond: new THREE.MeshStandardMaterial({ color: 0x8fd3f5, roughness: .03, metalness: .3, emissive: 0x1a5a80, emissiveIntensity: .2 }),
};

// zone floors (built once: the zones never move)
const floorIce = new THREE.Mesh(new THREE.PlaneGeometry(17 * C, 17 * C), M.iceFloor);
floorIce.rotation.x = -Math.PI / 2; floorIce.position.set(CX, .015, CX); floorIce.receiveShadow = true; scene.add(floorIce);
const floorTemple = new THREE.Mesh(new THREE.PlaneGeometry(9 * C, 9 * C), M.pave);
floorTemple.rotation.x = -Math.PI / 2; floorTemple.position.set(CX, .025, CX); floorTemple.receiveShadow = true; scene.add(floorTemple);

/** Box with chunky, inward-only jitter so walls look hewn but never poke into corridors. */
function hewn(seg, amt, seed) {
  const g = new THREE.BoxGeometry(C, 1, C, seg, seg + 1, seg), p = g.attributes.position, r = rng(seed), seen = new Map();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
    let o = seen.get(k);
    if (!o) {
      const ex = Math.abs(Math.abs(x) - C / 2) < 1e-3, ez = Math.abs(Math.abs(z) - C / 2) < 1e-3, bottom = y < -.49;
      o = bottom ? [0, 0, 0] : [ex ? -Math.sign(x) * r() * amt : (r() - .5) * amt * .3, y > .49 ? (r() - .5) * .06 : 0, ez ? -Math.sign(z) * r() * amt : (r() - .5) * amt * .3];
      seen.set(k, o);
    }
    p.setXYZ(i, x + o[0], y + o[1], z + o[2]);
  }
  g.computeVertexNormals(); return g;
}
const GEO = {
  frost: [hewn(2, .55, 11), hewn(2, .55, 22), hewn(3, .45, 33)],
  frostCap: hewn(2, .35, 44),
  ice: [hewn(1, .3, 55), hewn(2, .25, 66)],
  iceCap: hewn(1, .2, 77),
  temple: new THREE.BoxGeometry(C, 1, C),
  core: new THREE.BoxGeometry(1, 1, 1),
  templeCap: new THREE.BoxGeometry(C * 1.04, 1, C * 1.04),
  crystal: new THREE.OctahedronGeometry(.5, 0),
  icicle: new THREE.ConeGeometry(.16, 1, 5),
  vine: new THREE.PlaneGeometry(.5, 1),
  flame: null,
};

/* ================= per-round build ================= */
const group = new THREE.Group(); scene.add(group);
const flames = [], spires = [], crystals = [];
const campLights = [0, 1, 2].map(() => { const l = new THREE.PointLight(0xffa55a, 0, 11, 1.6); scene.add(l); return l; });
const flameMat = (c) => new THREE.SpriteMaterial({ map: flake, color: c, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false });
const Y = new THREE.Vector3(0, 1, 0);

function instanced(geo, mat, list, shadow = true) {
  const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length)); im.count = list.length;
  list.forEach((m, i) => { im.setMatrixAt(i, m.matrix); if (m.color) im.setColorAt(i, m.color); });
  im.castShadow = shadow; im.receiveShadow = true; group.add(im); return im;
}
const mat4 = (x, y, z, sx, sy, sz, rotY = 0, rotX = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rotX, rotY, 0)), new THREE.Vector3(sx, sy, sz));
function torch(x, y, z, face) {
  const bracket = new THREE.Mesh(new THREE.BoxGeometry(.14, .5, .14), M.wood); bracket.position.set(x, y, z); group.add(bracket);
  const f1 = new THREE.Sprite(flameMat(0xff8a2a)), f2 = new THREE.Sprite(flameMat(0xffe08a));
  f1.position.set(x + face[0] * .05, y + .45, z + face[1] * .05); f2.position.copy(f1.position);
  f1.scale.set(.9, 1.2, 1); f2.scale.set(.4, .6, 1); group.add(f1, f2); flames.push({ f1, f2, s: Math.random() * 10 });
}

function build(maze, seed) {
  disposeTree(group, false); group.clear(); flames.length = 0; spires.length = 0; crystals.length = 0;
  campLights.forEach((l) => l.intensity = 0);
  const r = rng(seed ^ 0x2f6e2b1), W = C / 4; // wall pieces are modelled 4 m wide; W stretches them to the current tile size
  floorIce.scale.set(W, W, 1); floorIce.position.set(CX, .015, CX); floorTemple.scale.set(W, W, 1); floorTemple.position.set(CX, .025, CX);
  const L = { frost: [[], [], []], frostCap: [], ice: [[], []], iceCap: [], temple: [], templeCap: [], crystal: [], icicle: [], vine: [], moss: [] };
  const rockTones = ['#8b8079', '#76706c', '#9c8f82', '#6d6662', '#a49886'].map((c) => new THREE.Color(c));
  const iceTones = ['#9fdcff', '#b9e8ff', '#86cdf5', '#c8f0ff'].map((c) => new THREE.Color(c));
  const open = (i, j) => i >= 0 && j >= 0 && i < GRID && j < GRID && !maze.g[i][j];

  for (let x = 0; x < GRID; x++) for (let z = 0; z < GRID; z++) {
    if (!maze.g[x][z]) continue;
    const top = maze.top[x][z], cx = x * C + C / 2, cz = z * C + C / 2, zone = zoneOf(x, z), rot = Math.floor(r() * 4) * Math.PI / 2;
    if (zone === 0) {
      const capH = .35 + r() * .35, h = top - capH;
      // stack the cliff in rough layers (about 3 m each) so tall walls read as layered rock, not one stretched block
      const n = Math.max(1, Math.round(h / 3.2)), seg = h / n, tone = rockTones[Math.floor(r() * rockTones.length)];
      for (let k = 0; k < n; k++) { const s = 1 - k * .012 + (r() - .5) * .03; L.frost[Math.floor(r() * 3)].push({ matrix: mat4(cx + (r() - .5) * .08, seg * k + seg / 2, cz + (r() - .5) * .08, s * W, seg * 1.02, s * W, Math.floor(r() * 4) * Math.PI / 2), color: tone.clone().offsetHSL(0, 0, (r() - .5) * .08 + (k % 2 ? .02 : -.02)) }); }
      L.frostCap.push({ matrix: mat4(cx, h + capH / 2, cz, 1.03 * W, capH, 1.03 * W, rot) });
    } else if (zone === 1) {
      const capH = .2 + r() * .15, h = top - capH;
      const n = Math.max(1, Math.round(h / 3.6)), seg = h / n;
      for (let k = 0; k < n; k++) { const s = 1 - k * .01 + (r() - .5) * .025; L.ice[Math.floor(r() * 2)].push({ matrix: mat4(cx, seg * k + seg / 2, cz, s * W, seg * 1.02, s * W, Math.floor(r() * 4) * Math.PI / 2), color: iceTones[Math.floor(r() * iceTones.length)].clone().offsetHSL(0, 0, k * .012) }); }
      L.iceCap.push({ matrix: mat4(cx, h + capH / 2, cz, 1.02 * W, capH, 1.02 * W, rot) });
      if (r() < .35) for (let k = 0, n = 1 + Math.floor(r() * 3); k < n; k++) {
        const s = .5 + r() * .9; L.crystal.push({ matrix: mat4(cx + (r() - .5) * 2.6, top + s * .5, cz + (r() - .5) * 2.6, s * .5, s * 1.8, s * .5, r() * 3, (r() - .5) * .5) });
      }
      // icicles hanging off ledges that face open corridors
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (open(x + a, z + b) && r() < .5) for (let k = 0; k < 3; k++) {
        const len = .5 + r() * 1.2, along = (r() - .5) * 3.2;
        L.icicle.push({ matrix: mat4(cx + a * (C / 2 + .05) + (b ? along * W : 0), top - .25 - len / 2, cz + b * (C / 2 + .05) + (a ? along * W : 0), 1, len, 1, 0, Math.PI) });
      }
    } else {
      const capH = .35, h = top - capH;
      // temple walls: courses of carved blocks with a thin ledge every course, so the runes keep their shape
      const n = Math.max(1, Math.round(h / 3.4)), seg = h / n;
      for (let k = 0; k < n; k++) { L.temple.push({ matrix: mat4(cx, seg * k + seg / 2, cz, W, seg, W, Math.floor(r() * 4) * Math.PI / 2) }); if (k) L.templeCap.push({ matrix: mat4(cx, seg * k, cz, 1.01 * W, .12, 1.01 * W, 0) }); }
      L.templeCap.push({ matrix: mat4(cx, h + capH / 2, cz, W, capH, W, rot) });
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (!open(x + a, z + b)) continue;
        if (r() < .45) for (let k = 0, n = 2 + Math.floor(r() * 3); k < n; k++) {
          const len = 1.5 + r() * 3.5, along = (r() - .5) * 3.4;
          L.vine.push({ matrix: mat4(cx + a * (C / 2 + .02) + (b ? along * W : 0), top - len / 2 - .2, cz + b * (C / 2 + .02) + (a ? along * W : 0), .5 + r() * .5, len, 1, a ? Math.PI / 2 : 0) });
        }
        if (r() < .1) torch(cx + a * (C / 2 + .12), 2.3, cz + b * (C / 2 + .12), [a, b]);
      }
    }
  }
  // solid cores: the hewn faces are pushed inward at random, so two neighbouring wall blocks can leave a crack you see straight
  // through. Each wall tile gets a plain box behind its rough skin that reaches all the way to any neighbouring wall (or door),
  // and stays tucked behind the jitter on sides that face a corridor. Seams become dark crevices instead of windows.
  const core = [], coreTone = [new THREE.Color('#4f4844'), new THREE.Color('#4d86ad')];
  const solid = (i, j) => i < 0 || j < 0 || i >= GRID || j >= GRID || maze.g[i][j] || maze.doorAt[i][j] >= 0;
  for (let x = 0; x < GRID; x++) for (let z = 0; z < GRID; z++) {
    if (!maze.g[x][z]) continue;
    const zone = zoneOf(x, z); if (zone === 2) continue; // temple blocks are exact boxes, no gaps to fill
    const inset = (zone === 0 ? .55 : .3) * W + .3, h = maze.top[x][z] - .05;
    const x0 = x * C + (solid(x - 1, z) ? 0 : inset), x1 = (x + 1) * C - (solid(x + 1, z) ? 0 : inset);
    const z0 = z * C + (solid(x, z - 1) ? 0 : inset), z1 = (z + 1) * C - (solid(x, z + 1) ? 0 : inset);
    core.push({ matrix: mat4((x0 + x1) / 2, h / 2, (z0 + z1) / 2, x1 - x0, h, z1 - z0), color: coreTone[zone] });
  }
  const coreMesh = instanced(GEO.core, M.core, core);
  const meshes = [
    coreMesh,
    ...L.frost.map((l, i) => instanced(GEO.frost[i], M.rock, l)), instanced(GEO.frostCap, M.snow, L.frostCap),
    ...L.ice.map((l, i) => instanced(GEO.ice[i], M.ice, l)), instanced(GEO.iceCap, M.frost, L.iceCap),
    instanced(GEO.temple, M.temple, L.temple), instanced(GEO.templeCap, M.moss, L.templeCap),
  ];
  rayTargets.push(...meshes);
  crystals.push(instanced(GEO.crystal, M.crystal, L.crystal, false));
  instanced(GEO.icicle, M.frost, L.icicle, false);
  instanced(GEO.vine, M.vine, L.vine, false);

  // obstacles: knee-high ones you jump, and taller rock steps you climb (with hand-holds on the faces you climb)
  const holdGeo = new THREE.DodecahedronGeometry(.13, 0), holdMats = [new THREE.MeshStandardMaterial({ color: 0xfff6e5, roughness: .9, flatShading: true }), new THREE.MeshStandardMaterial({ color: 0xff8a3d, roughness: .8, flatShading: true }), new THREE.MeshStandardMaterial({ color: 0x8be8ff, roughness: .2, emissive: 0x1f6a88, emissiveIntensity: .4, flatShading: true })];
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0xd8b27a, roughness: 1 }), ropeGeo = new THREE.CylinderGeometry(.035, .035, 1, 6);
  const holdLists = [[], [], []]; // hand-holds are drawn as three instanced batches, not hundreds of meshes
  const holds = (cx, cz, h, alongX, zone) => {
    // two climbing faces: the ends of the step that face along the corridor
    for (const s of [-1, 1]) for (let y = .55, k = 0; y < h - .25; y += .5, k++) for (const off of [-.9, .15, 1.05]) {
      const o = (off + (k % 2 ? .45 : 0) + (r() - .5) * .3) * W, face = C / 2 + .04;
      const mi = zone === 1 ? 2 : (k + Math.round(off)) % 3 === 0 ? 1 : 0;
      holdLists[mi].push({ matrix: mat4(cx + (alongX ? s * face : o), y + (r() - .5) * .12, cz + (alongX ? o : s * face), 1.2, .8, 1, r() * 3, r() * 3) });
    }
    // a knotted rope down one face in the frost ring
    if (zone === 0) for (const s of [-1, 1]) { const rp = new THREE.Mesh(ropeGeo, ropeMat); rp.scale.y = h - .1; rp.position.set(cx + (alongX ? s * (C / 2 + .07) : 1.6 * W), (h - .1) / 2, cz + (alongX ? 1.6 * W : s * (C / 2 + .07))); group.add(rp); }
  };
  for (let x = 0; x < GRID; x++) for (let z = 0; z < GRID; z++) {
    const h = maze.low[x][z]; if (!h) continue;
    const tall = h > 1.5, alongX = x % 2 === 0;
    const cx = x * C + C / 2, cz = z * C + C / 2, across = x % 2 === 0 ? Math.PI / 2 : 0;
    const zone = zoneOf(x, z);
    if (tall) {
      if (zone === 0) { // stacked boulders with a snowy top
        const a = new THREE.Mesh(GEO.frost[0], M.rock); a.scale.set(.98 * W, h * .55, .98 * W); a.position.set(cx, h * .275, cz); a.rotation.y = across;
        const b = new THREE.Mesh(GEO.frost[1], M.rock); b.scale.set(.94 * W, h * .48, .94 * W); b.position.set(cx, h * .72 - .06, cz); b.rotation.y = across + Math.PI;
        const cap = new THREE.Mesh(GEO.frostCap, M.snow); cap.scale.set(.99 * W, .35, .99 * W); cap.position.set(cx, h - .1, cz);
        [a, b, cap].forEach((o) => { o.castShadow = o.receiveShadow = true; group.add(o); rayTargets.push(o); });
      } else if (zone === 1) { // a frozen ledge of stacked ice slabs
        for (let k = 0, n = 3; k < n; k++) { const s = new THREE.Mesh(GEO.ice[k % 2], M.ice); s.scale.set((.98 - k * .03) * W, h / n * 1.02, (.98 - k * .03) * W); s.position.set(cx, h / n * (k + .5), cz); s.rotation.y = k * Math.PI / 2; s.castShadow = true; group.add(s); rayTargets.push(s); }
        const cap = new THREE.Mesh(GEO.iceCap, M.frost); cap.scale.set(W, .2, W); cap.position.set(cx, h - .08, cz); group.add(cap);
      } else { // a toppled temple block covered in moss and vines
        const blk = new THREE.Mesh(GEO.temple, M.temple); blk.scale.set(W * .98, h, W * .98); blk.position.set(cx, h / 2, cz); blk.rotation.set(0, across, (r() - .5) * .03); blk.castShadow = blk.receiveShadow = true; group.add(blk); rayTargets.push(blk);
        const moss = new THREE.Mesh(GEO.templeCap, M.moss); moss.scale.set(W, .18, W); moss.position.set(cx, h - .05, cz); group.add(moss);
        for (let k = 0; k < 5; k++) { const len = .6 + r() * 1.2, v = new THREE.Mesh(GEO.vine, M.vine); const s = r() < .5 ? -1 : 1, o = (r() - .5) * C * .8; v.scale.set(.6, len, 1); v.position.set(cx + (alongX ? s * (C / 2 + .03) : o), h - len / 2, cz + (alongX ? o : s * (C / 2 + .03))); v.rotation.y = alongX ? Math.PI / 2 : 0; group.add(v); }
      }
      holds(cx, cz, h, alongX, zone);
      continue;
    }
    if (zone === 0) {
      const drift = new THREE.Mesh(GEO.frostCap, M.snow); drift.scale.set(.98 * W, h - .25, .98 * W); drift.position.set(cx, (h - .25) / 2, cz); drift.receiveShadow = true; group.add(drift);
      const log = new THREE.Mesh(new THREE.CylinderGeometry(.3, .34, C * .95, 8), M.wood); log.rotation.set(0, across, Math.PI / 2); log.position.set(cx, h - .3, cz); log.castShadow = true; group.add(log);
      rayTargets.push(drift);
    } else {
      const block = new THREE.Mesh(GEO.ice[0], M.ice); block.scale.set(.97 * W, h, .97 * W); block.position.set(cx, h / 2, cz); block.castShadow = true; group.add(block); rayTargets.push(block);
    }
  }
  holdLists.forEach((l, i) => { if (l.length) instanced(holdGeo, holdMats[i], l, false); });
  // ice bridges with icicles underneath
  const bridgeGeo = new THREE.BoxGeometry(1, 1, 1), ic = [];
  for (let x = 0; x < GRID; x++) for (let z = 0; z < GRID; z++) {
    const b = maze.bridge[x][z]; if (!b) continue;
    const cx = x * C + C / 2, cz = z * C + C / 2, spanX = x % 2 === 1; // bridge spans between the flanking pillars
    const slab = new THREE.Mesh(bridgeGeo, M.ice); slab.scale.set(spanX ? C * 1.1 : C * .9, .55, spanX ? C * .9 : C * 1.1); slab.position.set(cx, b - .27, cz); slab.castShadow = slab.receiveShadow = true; group.add(slab); rayTargets.push(slab);
    for (let k = 0; k < 7; k++) { const len = .4 + r() * 1.4; ic.push({ matrix: mat4(cx + (r() - .5) * 3.4, b - .55 - len / 2, cz + (r() - .5) * 3.4, 1, len, 1, 0, Math.PI) }); }
  }
  instanced(GEO.icicle, M.frost, ic, false);

  // floor details: boulders out in the frost, frozen ponds in the caverns
  const bould = [], ponds = [];
  for (let x = 1; x < GRID - 1; x += 2) for (let z = 1; z < GRID - 1; z += 2) {
    const zone = zoneOf(x, z), cx = x * C + C / 2, cz = z * C + C / 2;
    if (zone === 0 && r() < .3) { const s = .5 + r() * .7; bould.push({ matrix: mat4(cx + (r() < .5 ? -1 : 1) * 1.5, .12 * s, cz + (r() - .5) * 2.5, s, s * .7, s, r() * 3, r()) }); }
    if (zone === 1 && r() < .12 && !maze.low[x][z]) ponds.push([cx, cz]);
  }
  instanced(new THREE.DodecahedronGeometry(.32, 0), new THREE.MeshStandardMaterial({ color: 0x7c746c, flatShading: true }), bould);
  ponds.forEach(([x, z]) => { const p = new THREE.Mesh(new THREE.CircleGeometry(1.5, 24), M.pond); p.rotation.x = -Math.PI / 2; p.position.set(x, .035, z); group.add(p); });

  // landmark 1: abandoned camps in frost dead-ends, each with a fire you can see glowing down the corridor
  const tentColors = [0xff6f59, 0xffd23f, 0x2ec4f1];
  maze.camps.forEach(([x, z, [dx, dz]], k) => {
    const cx = x * C + C / 2, cz = z * C + C / 2;
    const tent = new THREE.Mesh(new THREE.ConeGeometry(1.25, 1.7, 4), new THREE.MeshStandardMaterial({ color: tentColors[k % 3], roughness: .8, flatShading: true }));
    tent.position.set(cx - dx * 1.1 + dz * .6, .85, cz - dz * 1.1 + dx * .6); tent.rotation.y = Math.PI / 4; tent.castShadow = true; group.add(tent);
    const fx = cx + dx * .5 - dz * .6, fz = cz + dz * .5 - dx * .6;
    for (let s = 0; s < 7; s++) { const a = s / 7 * Math.PI * 2, st = new THREE.Mesh(new THREE.DodecahedronGeometry(.16, 0), M.rock); st.position.set(fx + Math.cos(a) * .45, .08, fz + Math.sin(a) * .45); group.add(st); }
    for (let s = 0; s < 3; s++) { const lg = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .8, 6), M.wood); lg.position.set(fx, .12, fz); lg.rotation.set(Math.PI / 2, s * 1.05, 0); group.add(lg); }
    const f1 = new THREE.Sprite(flameMat(0xff7a2a)), f2 = new THREE.Sprite(flameMat(0xffe08a));
    f1.position.set(fx, .55, fz); f2.position.set(fx, .45, fz); f1.scale.set(1.3, 1.7, 1); f2.scale.set(.6, .9, 1); group.add(f1, f2);
    flames.push({ f1, f2, s: k * 3, big: true });
    const light = campLights[k]; light.position.set(fx, 1.1, fz); light.intensity = 18; flames[flames.length - 1].light = light;
  });

  // landmark 2: three giant crystal spires on ice-zone pillars, each its own colour
  const spireColors = [0x5ee7ff, 0xb18cff, 0x7dffb2];
  maze.spires.forEach(([x, z, k]) => {
    const t = maze.top[x][z], cx = x * C + C / 2, cz = z * C + C / 2, col = spireColors[k % 3];
    const mat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.1, roughness: .1, flatShading: true, transparent: true, opacity: .92 });
    const g = new THREE.Group(); g.position.set(cx, t, cz);
    [[0, 0, 11, 1.3], [.9, .3, 7, .8], [-.7, -.6, 6, .7], [.2, -.9, 4.5, .6]].forEach(([ox, oz, h, w], i) => {
      const c = new THREE.Mesh(GEO.crystal, mat); c.scale.set(w, h, w); c.position.set(ox, h * .45, oz); c.rotation.set((ox) * .18, i, (oz) * .18); g.add(c);
    });
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: flake, color: col, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false, opacity: .8 }));
    halo.position.y = 10.5; halo.scale.set(9, 9, 1); g.add(halo);
    group.add(g); spires.push({ mat, halo, s: k * 2 });
  });

  // landmark 3: four temple obelisks on the pillars around the sanctuary
  for (const [a, b] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) {
    const x = MID + a, z = MID + b; if (!maze.g[x][z]) continue;
    const t = maze.top[x][z], cx = x * C + C / 2, cz = z * C + C / 2;
    const ob = new THREE.Mesh(new THREE.CylinderGeometry(.55, 1.05, 8, 4), M.temple); ob.position.set(cx, t + 4, cz); ob.rotation.y = Math.PI / 4; ob.castShadow = true; group.add(ob);
    const gem = new THREE.Mesh(GEO.crystal, new THREE.MeshStandardMaterial({ color: 0x9bffe4, emissive: 0x4dffd2, emissiveIntensity: 1.6 })); gem.scale.set(.9, 1.5, .9); gem.position.set(cx, t + 8.8, cz); group.add(gem);
    spires.push({ mat: gem.material, s: a + b, gem });
  }
}
setBuildHook(build);
export function showDecor(v) { group.visible = v; floorIce.visible = v; floorTemple.visible = v; campLights.forEach((l) => l.visible = v); }

/* ================= zone-tinted fog ================= */
const FOG = [new THREE.Color(0xf3e2dc), new THREE.Color(0xcfe6fb), new THREE.Color(0xe4ecc8)];
const tmp = new THREE.Color();
/** Fog colour for wherever the viewer stands, blended across zone borders. */
export function zoneFog(x, z) {
  const ring = Math.max(Math.abs(x - CX), Math.abs(z - CX)) / C;
  if (ring > 9.5) return tmp.copy(FOG[0]);
  if (ring > 8) return tmp.copy(FOG[1]).lerp(FOG[0], (ring - 8) / 1.5);
  if (ring > 5.5) return tmp.copy(FOG[1]);
  if (ring > 4) return tmp.copy(FOG[2]).lerp(FOG[1], (ring - 4) / 1.5);
  return tmp.copy(FOG[2]);
}
export const ZONE_NAMES = ['the Frost Cliffs', 'the Ice Caverns', 'the Overgrown Temple'];

/* ================= animation ================= */
let t = 0;
export function decorUpdate(dt) {
  t += dt;
  auroras.forEach((m) => {
    const p = m.geometry.attributes.position.array, base = m.userData.base, k = m.userData.k;
    for (let i = 0; i < p.length; i += 3) { const x = base[i]; p[i + 2] = Math.sin(x * .012 + t * .25 + k) * 40 + Math.sin(x * .031 - t * .4) * 12; p[i + 1] = base[i + 1] + Math.sin(x * .02 + t * .5 + k * 2) * 6; }
    m.geometry.attributes.position.needsUpdate = true;
    m.material.map.offset.x = t * .01 * (k + 1);
  });
  for (const f of flames) {
    const w = 1 + Math.sin(t * 13 + f.s) * .12 + Math.sin(t * 23 + f.s * 2) * .08, base = f.big ? 1.3 : .9;
    f.f1.scale.set(base * w, base * 1.3 * (2 - w), 1); f2scale(f, w);
    if (f.light) f.light.intensity = 16 + Math.sin(t * 17 + f.s) * 3 + Math.sin(t * 7) * 2;
  }
  for (const s of spires) { s.mat.emissiveIntensity = 1.1 + Math.sin(t * 1.3 + s.s) * .35; if (s.gem) s.gem.rotation.y = t * .8; }
  crystals.forEach((c) => c.material.emissiveIntensity = 1.2 + Math.sin(t * 2) * .25);
}
function f2scale(f, w) { const b = f.big ? .6 : .4; f.f2.scale.set(b * (2 - w), b * 1.5 * w, 1); }
