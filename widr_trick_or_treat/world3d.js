// 3D world renderer. Reads the same game state (S, P, hero…) as the 2D version.
import { THREE, mat, part, buildChar, animChar, emojiSprite, emojiMat, setEmoji, tagSprite, setTag, floatSprite, glowTex, OUT } from './chars3d.js';

const R = {ready: false};
const stage = document.getElementById('stage');
const gl = document.createElement('canvas');
gl.id = 'gl'; gl.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none';
const renderer = new THREE.WebGLRenderer({canvas: gl, antialias: true});
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 5, 6000);
const hemiL = new THREE.HemisphereLight('#fff1dc', '#b8a878', 1.1); scene.add(hemiL);
const sun = new THREE.DirectionalLight('#ffb070', 1.6);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, {left: -650, right: 650, top: 650, bottom: -650, near: 10, far: 2200});
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.6;
scene.add(sun, sun.target);
const lantern = new THREE.PointLight('#ffc27a', 0.6, 240, 0); scene.add(lantern);
scene.fog = new THREE.Fog('#ffd2a8', 900, 2400);

const overlay = document.createElement('div');
overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;transition:background .1s';

let world = null, H3 = new Map(), houseMeshes = [], actors = new Map(), pickMap = new Map(), floatMap = new Map();
let player, playerCos, playerTag, shieldRing, powerRing, byteG, ufoG, blastRing, rain, rainPos, pumpkinsLit = [], lampGlows = [], porchGlows = [];
let camD = 640, camT = new THREE.Vector3(), lastT = performance.now();
const lerpC = (a, b, k) => new THREE.Color(a).lerp(new THREE.Color(b), k);
const PUMPKIN_ON = mat('#ff7a1f', {emissive: '#ff8a1f', ei: 0.9}), PUMPKIN_OFF = mat('#c86a2a');
const WIN_ON = new THREE.MeshToonMaterial({color: '#ffe08a', emissive: new THREE.Color('#ffc44a'), emissiveIntensity: 0.4});
const WIN_OFF = mat('#4a4560');
const WIN_RED = new THREE.MeshToonMaterial({color: '#ff3b3b', emissive: new THREE.Color('#ff1a1a'), emissiveIntensity: 1.6});

/* ---------- ground ---------- */
function groundTexture() {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.fillStyle = '#d6e3a8'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 2600; i++) { g.fillStyle = pick(['#c8d897', '#e2eab8', '#e8a65a', '#d9893a', '#b9cc84']); g.globalAlpha = 0.55; g.beginPath(); g.ellipse(rnd(0, W), rnd(0, H), rnd(1.5, 4), rnd(1, 2.5), rnd(0, 3), 0, Math.PI * 2); g.fill(); }
  g.globalAlpha = 1;
  g.fillStyle = '#f1e8d6'; HY.forEach(y => g.fillRect(0, y - 52, W, 104)); VX.forEach(x => g.fillRect(x - 52, 0, 104, H));
  g.strokeStyle = 'rgba(29,26,47,.12)'; g.lineWidth = 2;
  HY.forEach(y => { for (let x = 0; x < W; x += 26) { g.beginPath(); g.moveTo(x, y - 52); g.lineTo(x, y - 42); g.moveTo(x, y + 42); g.lineTo(x, y + 52); g.stroke(); } });
  g.fillStyle = '#cbc2b4'; HY.forEach(y => g.fillRect(0, y - 40, W, 80)); VX.forEach(x => g.fillRect(x - 40, 0, 80, H));
  g.strokeStyle = '#ffffff'; g.lineWidth = 4; g.setLineDash([22, 18]);
  HY.forEach(y => { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); });
  VX.forEach(x => { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); });
  g.setLineDash([]);
  // crosswalks
  g.fillStyle = 'rgba(255,255,255,.85)';
  VX.forEach(x => HY.forEach(y => { for (let i = -32; i <= 32; i += 12) { g.fillRect(x + i - 3, y - 58, 6, 14); g.fillRect(x - 58, y + i - 3, 14, 6); } }));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

/* ---------- houses ---------- */
function signFor(h, reveal) {
  if (h.kind === 'home') return '🏠';
  if (h.kind === 'haunted') return '👻';
  if (h.kind === 'dark') return '🌑';
  if (h.done) return '✔️';
  if (h.rumor) return '🌟';
  if (h.kind === 'res') return h.res.icon;
  return reveal ? (h.mimic ? '👹' : DOOR_EVENTS[h.event].icon) : '❔';
}
function pumpkin(parent, x, z, lit, s = 1) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); parent.add(g);
  const m = part(g, new THREE.SphereGeometry(7, 14, 10), lit ? PUMPKIN_ON : PUMPKIN_OFF, [0, 6, 0], {scale: [1.15, 0.85, 1.15], ol: 1.1});
  part(g, new THREE.CylinderGeometry(1, 1.3, 4, 6), '#3c7a2a', [0, 12.5, 0], {outline: false});
  return m;
}
function buildHouse(h) {
  const g = new THREE.Group(); world.add(g);
  const cx = h.cx, cz = h.y + h.h / 2, HT = h.kind === 'haunted' ? 70 : 56;
  const bodyCol = h.kind === 'dark' ? '#b8b0c4' : h.color;
  const body = part(g, new THREE.BoxGeometry(h.w, HT, h.h), bodyCol, [cx, HT / 2, cz], {ol: 1.025, receive: true});
  const roofH = h.kind === 'haunted' ? 62 : 42;
  const roof = part(g, new THREE.ConeGeometry(1, 1, 4), h.roof, [cx, HT + roofH / 2, cz], {rot: [0, Math.PI / 4, h.kind === 'haunted' ? 0.06 : 0], scale: [(h.w / 2 + 9) * Math.SQRT2, roofH, (h.h / 2 + 9) * Math.SQRT2], ol: 1.03});
  body.userData.house = roof.userData.house = h; houseMeshes.push(body, roof);
  part(g, new THREE.BoxGeometry(12, 26, 12), '#8b5a2b', [cx + 34, HT + 26, cz - 10], {ol: 1.08});
  const front = h.dir === 'bottom' ? 1 : -1, fz = h.dir === 'bottom' ? h.y + h.h : h.y;
  part(g, new THREE.BoxGeometry(24, 34, 3), h.kind === 'home' ? '#ff7a1f' : '#7a4a24', [cx, 17, fz + front * 1.5], {ol: 1.06});
  part(g, new THREE.SphereGeometry(1.6, 6, 6), '#ffd23f', [cx + 7, 17, fz + front * 3.5], {outline: false});
  part(g, new THREE.BoxGeometry(40, 3, 16), '#e8dcc6', [cx, 1.5, fz + front * 8], {ol: 1.04, receive: true});
  const wins = [];
  for (const side of [fz + front * 1, h.dir === 'bottom' ? h.y - 1 : h.y + h.h + 1])
    for (const dx of [-40, 40]) wins.push(part(g, new THREE.BoxGeometry(18, 16, 2), h.kind === 'dark' ? WIN_OFF : WIN_ON, [cx + dx, 34, side], {ol: 1.1, shadow: false}));
  const pk = pumpkin(g, cx + 28, fz + front * 14, true);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(110, 110), new THREE.MeshBasicMaterial({map: glowTex('rgba(255,200,90,.7)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending}));
  glow.rotation.x = -Math.PI / 2; glow.position.set(cx, 3.5, fz + front * 18); g.add(glow); porchGlows.push(glow);
  const sign = emojiSprite(signFor(h, false), h.kind === 'home' || h.kind === 'haunted' ? 44 : 34, false);
  sign.position.set(cx, HT + roofH + 24, cz); sign.renderOrder = 5; g.add(sign);
  let label = null;
  if (h.kind === 'res' || h.kind === 'haunted' || h.kind === 'home') {
    label = tagSprite(h.kind === 'res' ? h.res.name : h.kind === 'home' ? 'HOME' : 'HAUNTED', 14);
    label.position.set(cx, HT + roofH + 50, cz); g.add(label);
  }
  if (h.kind === 'haunted') {
    const ghost = buildChar(GOONPOSTER, 1.2); ghost.position.set(cx - 40, HT + 12, cz); ghost.userData.fixed = true; g.add(ghost);
    actors.set('goon', ghost);
    for (let i = 0; i < 5; i++) {
      const gx = cx - 60 + i * 30, gz = h.y - 26 - (i % 2) * 10;
      part(g, new THREE.BoxGeometry(12, 18, 4), '#a9a4b8', [gx, 9, gz], {rot: [0, 0, rnd(-0.15, 0.15)], ol: 1.1});
    }
  }
  if (h.kind === 'home') {
    part(g, new THREE.CylinderGeometry(1.2, 1.2, 40, 6), '#1d1a2f', [cx - 50, HT + 20, cz + 30], {outline: false});
    part(g, new THREE.BoxGeometry(22, 14, 1), '#ff7a1f', [cx - 39, HT + 32, cz + 30], {ol: 1.1});
  }
  // re-centre the house on its own pivot so it can stand up and walk
  g.children.forEach(c => { c.position.x -= cx; c.position.z -= cz; });
  g.position.set(cx, 0, cz);
  const mon = new THREE.Group(); mon.visible = false; g.add(mon);
  const legs = [], lfz = fz - cz;
  for (const lx of [-h.w / 2 + 16, h.w / 2 - 16]) for (const lz of [-h.h / 2 + 14, h.h / 2 - 14]) {
    const piv = new THREE.Group(); piv.position.set(lx, 2, lz); mon.add(piv);
    part(piv, new THREE.CylinderGeometry(5.5, 4, 34, 8), '#3a3450', [0, -17, 0], {ol: 1.12});
    part(piv, new THREE.SphereGeometry(7, 10, 8), '#3a3450', [0, -34, 3], {scale: [1, 0.6, 1.5], ol: 1.1});
    legs.push(piv);
  }
  const eyeM = mat('#ffd23f', {emissive: '#ff4a1f', ei: 1.8});
  for (const s of [-1, 1]) {
    part(mon, new THREE.SphereGeometry(9, 14, 10), eyeM, [s * 32, HT * 0.66, lfz + front * 2], {ol: 1.12});
    part(mon, new THREE.SphereGeometry(3.5, 8, 6), '#1d1a2f', [s * 32, HT * 0.66, lfz + front * 9.5], {outline: false});
    part(mon, new THREE.BoxGeometry(18, 3, 3), '#1d1a2f', [s * 32, HT * 0.66 + 11, lfz + front * 3], {rot: [0, 0, s * 0.35], outline: false});
  }
  part(mon, new THREE.BoxGeometry(70, 18, 3), '#2a0a14', [0, 15, lfz + front * 3.2], {ol: 1.04});
  const tooth = new THREE.ConeGeometry(3.2, 8, 4), toothM = mat('#ffffff');
  for (let i = 0; i < 8; i++) {
    const tx = -30 + i * 8.6;
    part(mon, tooth, toothM, [tx, 21, lfz + front * 5], {rot: [Math.PI, 0, 0], outline: false});
    part(mon, tooth, toothM, [tx + 4, 9, lfz + front * 5], {outline: false});
  }
  H3.set(h, {sign, label, pk, glow, wins, base: sign.position.y, group: g, mon, legs, front, home: {x: cx, z: cz}, dark: h.kind === 'dark'});
}

/* ---------- build the whole street for a new night ---------- */
R.build = () => {
  if (world) scene.remove(world);
  world = new THREE.Group(); scene.add(world);
  H3 = new Map(); houseMeshes = []; actors = new Map(); pickMap = new Map(); floatMap.forEach(s => s.material.dispose()); floatMap = new Map(); lampGlows = []; porchGlows = [];
  const under = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), mat('#c6d495'));
  under.rotation.x = -Math.PI / 2; under.position.set(W / 2, -1, H / 2); under.receiveShadow = true; world.add(under);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshToonMaterial({map: groundTexture()}));
  ground.rotation.x = -Math.PI / 2; ground.position.set(W / 2, 0, H / 2); ground.receiveShadow = true; world.add(ground);
  // hedges around the edge of the neighbourhood
  [[W / 2, -8, W + 32, 16], [W / 2, H + 8, W + 32, 16], [-8, H / 2, 16, H], [W + 8, H / 2, 16, H]].forEach(([x, z, w, d]) =>
    part(world, new THREE.BoxGeometry(w, 18, d), '#7fa24a', [x, 9, z], {ol: 1.01, receive: true}));
  S.houses.forEach(buildHouse);
  // trees
  for (const tr of S.trees) {
    part(world, new THREE.CylinderGeometry(2.6, 3.6, 18, 7), '#8b5a2b', [tr.x, 9, tr.y], {outline: false});
    if (Math.random() < 0.5) part(world, new THREE.ConeGeometry(tr.r, tr.r * 2.6, 9), tr.c, [tr.x, 16 + tr.r * 1.3, tr.y], {ol: 1.06});
    else part(world, new THREE.IcosahedronGeometry(tr.r * 1.05, 1), tr.c, [tr.x, 18 + tr.r, tr.y], {ol: 1.06});
  }
  // lawn pumpkins
  for (let i = 0, n = 0; i < 400 && n < 26; i++) {
    const x = rnd(20, W - 20), z = rnd(20, H - 20);
    if (onRoad(x, z, 14) || inHouse(x, z, 18)) continue;
    pumpkin(world, x, z, Math.random() < 0.5, rnd(0.8, 1.4)); n++;
  }
  // street lamps
  const bulbM = mat('#fff2b0', {emissive: '#ffd060', ei: 1.4});
  VX.forEach(x => HY.forEach(y => {
    part(world, new THREE.CylinderGeometry(1.8, 2.4, 64, 8), '#3a3450', [x + 46, 32, y - 46], {outline: false});
    part(world, new THREE.SphereGeometry(5, 12, 10), bulbM, [x + 46, 66, y - 46], {ol: 1.15, shadow: false});
    const gw = new THREE.Mesh(new THREE.PlaneGeometry(170, 170), new THREE.MeshBasicMaterial({map: glowTex('rgba(255,215,120,.6)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending}));
    gw.rotation.x = -Math.PI / 2; gw.position.set(x + 46, 0.8, y - 46); world.add(gw); lampGlows.push(gw);
  }));
  // player
  player = buildChar(hero, 1.15); world.add(player);
  playerCos = emojiSprite(S.costume.e, 18); player.add(playerCos);
  playerTag = tagSprite('YOU', 13); player.add(playerTag);
  shieldRing = new THREE.Mesh(new THREE.TorusGeometry(28, 1.6, 8, 40), new THREE.MeshBasicMaterial({color: '#3c8dff', transparent: true, opacity: 0.7}));
  shieldRing.rotation.x = Math.PI / 2; shieldRing.position.y = 10; player.add(shieldRing);
  powerRing = new THREE.Mesh(new THREE.TorusGeometry(34, 2.4, 8, 40), new THREE.MeshBasicMaterial({color: '#ffc21f', transparent: true, opacity: 0.85}));
  powerRing.rotation.x = Math.PI / 2; powerRing.position.y = 4; player.add(powerRing);
  player.position.set(P.x, 0, P.y);
  // friends
  S.friends.forEach(f => {
    const g = buildChar(f.ch, 1); g.position.set(f.x, 0, f.y);
    const tg = tagSprite(f.ch.name, 12); tg.position.y = g.userData.top + 12; g.add(tg); g.userData.tag = tg;
    const ic = emojiSprite(f.ch.icon || '⭐', 15); ic.position.set(0, g.userData.top + 28, 0); g.add(ic);
    world.add(g); actors.set(f, g);
  });
  // Byte, UFO, blast, rain
  byteG = buildChar(BYTE, 0.85); byteG.visible = false; world.add(byteG);
  ufoG = new THREE.Group(); ufoG.visible = false; world.add(ufoG);
  const ufoBody = new THREE.Group(); ufoG.add(ufoBody); ufoG.userData.body = ufoBody;
  part(ufoBody, new THREE.CylinderGeometry(46, 30, 12, 28), '#c9d6e0', [0, 0, 0], {ol: 1.05});
  part(ufoBody, new THREE.SphereGeometry(20, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat('#7fff7f', {opacity: 0.8}), [0, 6, 0], {ol: 1.05});
  ufoG.userData.lights = [];
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ufoG.userData.lights.push(part(ufoBody, new THREE.SphereGeometry(3, 8, 6), mat('#ffd23f', {emissive: '#ffd23f', ei: 1, unique: true}), [Math.cos(a) * 40, -1, Math.sin(a) * 40], {outline: false})); }
  const toon = buildChar(TOON, 0.9); toon.position.y = 4; ufoBody.add(toon); ufoG.userData.toon = toon;
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(22, 48, 70, 24, 1, true), new THREE.MeshBasicMaterial({color: '#7fff7f', transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide}));
  beam.position.y = -40; ufoBody.add(beam);
  const utag = tagSprite('TOON’S UFO', 14); utag.position.y = 52; ufoG.add(utag);
  ufoG.userData.pick = [ufoBody];
  blastRing = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 48), new THREE.MeshBasicMaterial({color: '#ff7a1f', transparent: true, side: THREE.DoubleSide, depthWrite: false}));
  blastRing.rotation.x = -Math.PI / 2; blastRing.position.y = 3; blastRing.visible = false; world.add(blastRing);
  rainPos = new Float32Array(700 * 6);
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({color: '#5a7ab0', transparent: true, opacity: 0.55}));
  rain.frustumCulled = false; rain.visible = false; world.add(rain);
  for (let i = 0; i < 700; i++) resetDrop(i, true);
  camT.set(P.x, 0, P.y);
};
function resetDrop(i, any) {
  const x = camT.x + rnd(-600, 600), z = camT.z + rnd(-500, 500), y = any ? rnd(0, 420) : 420;
  rainPos.set([x, y, z, x - 4, y + 22, z], i * 6);
}

window.R3D = R;
export { R, renderer, scene, camera, hemiL, sun, lantern, overlay, gl, stage };
export const W3 = { get world() { return world; }, get H3() { return H3; }, get houseMeshes() { return houseMeshes; }, get actors() { return actors; },
  get pickMap() { return pickMap; }, get floatMap() { return floatMap; }, get player() { return player; }, get playerCos() { return playerCos; },
  get playerTag() { return playerTag; }, get shieldRing() { return shieldRing; }, get powerRing() { return powerRing; }, get byteG() { return byteG; },
  get ufoG() { return ufoG; }, get blastRing() { return blastRing; }, get rain() { return rain; }, get rainPos() { return rainPos; },
  get lampGlows() { return lampGlows; }, get porchGlows() { return porchGlows; },
  camT, signFor, resetDrop, lerpC, WIN_ON, WIN_OFF, WIN_RED, PUMPKIN_ON, PUMPKIN_OFF,
  get camD() { return camD; }, set camD(v) { camD = v; }, get lastT() { return lastT; }, set lastT(v) { lastT = v; } };
