import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { SPORTS_A } from './sports-a.js';
import { SPORTS_B } from './sports-b.js';
import { SPORTS_C } from './sports-c.js';
import { SPORTS_D } from './sports-d.js';
import { SPORTS_E } from './sports-e.js';
import { SPORTS_F } from './sports-f.js';
import { TEX } from './textures.js';
import { buildWorld } from './world.js';
import { createFX } from './fx.js';
import { audio, sfx as playSfx, setMusic, setSfx, isMusicOn, isSfxOn } from './audio.js';
import { makeCharacter, clearCharacters, reactAll, updateCharacters } from './characters.js';

const SPORTS = [...SPORTS_A, ...SPORTS_B, ...SPORTS_C, ...SPORTS_D, ...SPORTS_E, ...SPORTS_F];
const $ = (id) => document.getElementById(id);
const hex = (n) => '#' + n.toString(16).padStart(6, '0');

// how each sport is played with real motion in a headset
const VR_HOW = {
  bowling: 'Hold trigger to grab the ball, swing your arm and let go',
  archery: 'Bow is in your other hand. Trigger + pull back, let go to shoot',
  basketball: 'Hold trigger to grab, make a shooting motion, let go',
  golf: 'The putter hangs from your hand. Swing it through the ball',
  pingpong: 'Your controller is the paddle. Just swing!',
  frisbee: 'Hold trigger, throw, let go. Tilt your wrist to curve it',
  sword: 'Your controller is the sword. Slash fast through the fruit',
  cruise: 'Hands on the bars: push one forward to turn. Trigger = boost',
  boxing: 'Your fists are the controllers. Blue = left, red = right, punch fast',
  darts: 'Trigger to pick up a dart, make a real dart throw, let go',
  canoe: 'Hold the paddle in both hands. Dip one end low and pull back, alternate',
  keeper: 'Your hands are the gloves. Block the shot; trigger at impact = catch',
};
// the WIDR main cast hosting each sport; Josh owns the resort and watches every event (josh: where Josh stands)
const HOSTS = {
  bowling: { name: 'Nathan', from: 'WIDR main cast', look: { body: 0x13a9c2, hat: 'cap', hatColor: 0x123247 }, pos: [1.7, 0, -0.4], face: [0, 1.9], josh: [-1.8, 0, -0.2],
    hi: 'Nathan here, lane captain. Line it up, let it roll, and leave nothing standing.', win: "That's how you clear a lane! Nathan approves.", lose: 'Gutter vibes… run it back, I believe in you.' },
  archery: { name: 'Daniel', from: 'Demolition Run', look: { body: 0x55606a, hat: 'hardhat', hatColor: 0xffc93c, pants: 0x3a3f2a }, pos: [-2.4, 0, -1.2], face: [0, 0.5], josh: [2.4, 0, -1.4],
    hi: "No C4 on this range, Reshman's orders. Just you, a bow and the sea wind.", win: 'Target down. Clean work, specialist.', lose: "That's not rubble yet. Again." },
  basketball: { name: 'Lars', from: 'WIDR main cast', look: { body: 0xff6b4f, pants: 0x26313a }, pos: [3.2, 0, -6.2], face: [0, 0], josh: [-3.4, 0, -6],
    hi: 'Lars on the sideline. Five spots, fifteen balls, and the pink one is worth double.', win: 'Splash city! Lars is impressed.', lose: "Hmm, the rim is still undefeated. Let's go again." },
  golf: { name: 'Milo', from: 'Binas in Orbit', look: { body: 0x2f9e5b, hat: 'goggles', hatColor: 0x13a9c2, pants: 0x5a3a1e }, pos: [-12.4, 0, 2], face: [0, 0], josh: [-12.2, 0, -1.4],
    hi: 'Psst, Milo here. Read the slope arrows, then putt. That is my only tip.', win: 'Smooth! Milo would have needed twice the strokes.', lose: 'The cup moved. Definitely. Try again.' },
  pingpong: { name: 'Fionn', from: 'Binas in Orbit', look: { body: 0x6b3fa0, pants: 0x2a1a40 }, josh: [2.7, 0, -1.4],
    hi: "Fionn's serve, first to 7. Hope you warmed up!", win: 'No way… okay, you got me this time.', lose: 'Fionn takes it! Rematch whenever you like.' },
  frisbee: { name: 'Deniz', from: 'WIDR main cast', look: { body: 0xffc93c, hat: 'cap', hatColor: 0xff6b4f, pants: 0x13a9c2 }, pos: [2.2, 0, 13.6], face: [0, 6], josh: [-2.4, 0, 13.8],
    hi: 'Deniz on disc duty. Land it on the rings, and smack those floating pears on the way.', win: 'Throwing like a pro. Deniz is taking notes.', lose: 'The wind did it. Probably. One more round?' },
  sword: { name: 'Adam', from: 'WIDR main cast', look: { body: 0x26313a, hat: 'ninja', hatColor: 0xe8403a, pants: 0x1b2026 }, pos: [-2.3, 0, -2.2], face: [0, 1.6], josh: [2.4, 0, -2.4],
    hi: "Welcome to Adam's dojo. Slice the fruit fast, and do NOT touch the bombs.", win: 'Blade master! Adam bows to you.', lose: 'Too many bombs, not enough fruit. Again!' },
  cruise: { name: 'Rênas', from: 'Binas in Orbit', look: { body: 0x1f5f9a, hat: 'helmet', hatColor: 0xffc93c, pants: 0xffffff }, pos: [9, -0.35, 102], face: [0, 84], raft: true, josh: [10.3, -0.35, 102.4],
    hi: 'No Launch Stars today. Hit every ring like a Komeetduik dash and keep the clock alive!', win: 'You did it! That was Rênas-level flying.', lose: 'Even a Komeetduik needs a second try.' },
  boxing: { name: 'Lars', from: 'WIDR main cast', look: { body: 0xff6b4f, pants: 0x26313a }, pos: [4.1, 0, -1.6], face: [0, -0.6], josh: [-4.1, 0, -1.8],
    hi: 'Coach Lars in your corner. Blue pad, left fist. Red pad, right fist. Gold, anything goes!', win: 'Knockout combo! Lars is sweating just watching.', lose: 'Gloves up, chin down. One more round.' },
  darts: { name: 'Milo', from: 'Binas in Orbit', look: { body: 0x2f9e5b, hat: 'goggles', hatColor: 0x13a9c2, pants: 0x5a3a1e }, pos: [1.9, 0, 0.3], face: [0, -2.3], josh: [-1.9, 0, 0.3],
    hi: 'Milo’s bar, Milo’s board. Three rounds of three darts. Aim for the treble 20.', win: 'One hundred and eightyyy! Well, close enough.', lose: 'The board is round. The darts are pointy. Try again.' },
  canoe: { name: 'Deniz', from: 'WIDR main cast', look: { body: 0xffc93c, hat: 'cap', hatColor: 0xff6b4f, pants: 0x13a9c2 }, face: [-30, 280], josh: [-37.5, -0.2, 301],
    hi: 'Deniz in the yellow canoe. 200 metres to the finish, try to keep up!', win: 'You beat me?! Deniz demands a rematch.', lose: 'Deniz takes the bay! Paddle harder next time.' },
  keeper: { name: 'Nathan', from: 'WIDR main cast', look: { body: 0x13a9c2, hat: 'cap', hatColor: 0x123247 }, face: [0, -6], josh: [-5.5, 0, -2.5],
    hi: 'Nathan on penalties. Twelve shots, curlers, rockets and two golden balls. Good luck, keeper.', win: 'A wall! Nathan could not get one past you.', lose: 'Nathan is on fire today. Dive again!' },
};
const JOSH = { name: 'Josh', look: { body: 0xffc93c, hat: 'cap', hatColor: 0xe8403a, pants: 0x123247 },
  menu: 'Welcome to WIDR Resort! I built twelve sports for the crew. Pick one, beat their scores, collect every gold.' };
// bronze / silver / gold score thresholds
const MEDALS = { bowling: [40, 60, 80], archery: [40, 56, 68], basketball: [7, 11, 15], golf: [10, 16, 22], pingpong: [30, 60, 100], frisbee: [250, 450, 700], sword: [200, 350, 500], cruise: [150, 350, 600], boxing: [400, 800, 1300], darts: [120, 200, 280], canoe: [250, 380, 470], keeper: [500, 900, 1300] };
const MEDAL_ICON = ['', '🥉', '🥈', '🥇'], MEDAL_NAME = ['No medal', 'Bronze', 'Silver', 'Gold'];
const medalFor = (id, s) => MEDALS[id].filter((m) => s >= m).length;

// ---------- renderer / scene ----------
const quality = { high: localStorage.getItem('widr-quality') !== 'low' };
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, quality.high ? 2 : 1.25));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = quality.high;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.xr.enabled = true;
$('stage').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.03, 2200);
const rig = new THREE.Group(); rig.add(camera); scene.add(rig);
const camAttach = new THREE.Group(); camera.add(camAttach);
const world = buildWorld(scene, renderer, quality);
const fx = createFX(scene);

function m(geo, color, o = {}) {
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? 0.62, metalness: o.metal ?? 0, ...(o.mat || {}) }));
  mesh.castShadow = o.cast ?? true; mesh.receiveShadow = o.receive ?? true;
  return mesh;
}

// ---------- input ----------
const raycaster = new THREE.Raycaster();
const input = {
  ndc: new THREE.Vector2(), ndcVel: new THREE.Vector2(), down: false, pressT: 0, ray: new THREE.Ray(), keys: {},
  charge() { if (!this.down) return 0; const t = (performance.now() - this.pressT) / 1000; return 0.5 - 0.5 * Math.cos(t * Math.PI * 1.2); },
};
let lastMove = performance.now();
const canvas = renderer.domElement;
const setCross = (e) => { $('crosshair').style.setProperty('--cx', e.clientX + 'px'); $('crosshair').style.setProperty('--cy', e.clientY + 'px'); };
canvas.addEventListener('pointermove', (e) => {
  const nx = (e.clientX / innerWidth) * 2 - 1, ny = -(e.clientY / innerHeight) * 2 + 1;
  const now = performance.now(), dt = Math.max(0.008, (now - lastMove) / 1000); lastMove = now;
  input.ndcVel.lerp(new THREE.Vector2((nx - input.ndc.x) / dt, (ny - input.ndc.y) / dt), 0.5);
  input.ndc.set(nx, ny); setCross(e);
});
canvas.addEventListener('pointerdown', (e) => {
  audio(); canvas.setPointerCapture(e.pointerId);
  input.ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  if (e.pointerType !== 'mouse') input.ndcVel.set(0, 0);
  setCross(e); lastMove = performance.now(); press();
});
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);
function press() { input.down = true; input.pressT = performance.now(); if (game && !game.finished) game.onPress?.(); else if (game?.finished && renderer.xr.isPresenting) startSport(currentIndex); }
function release() { if (!input.down) return; input.lastCharge = input.charge(); input.down = false; if (game && !game.finished) game.onRelease?.(); }
addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { showMenu(); return; }
  if (e.key === 'm' || e.key === 'M') { toggleMusic(); return; }
  if (input.keys[e.key]) return;
  input.keys[e.key] = true;
  if (e.key === ' ' && game && !game.finished && !input.down) press();
  game?.onKey?.(e.key, true);
});
addEventListener('keyup', (e) => { input.keys[e.key] = false; if (e.key === ' ') release(); game?.onKey?.(e.key, false); });

// ---------- VR controllers + hand tracking ----------
const controllers = [0, 1].map((i) => {
  const c = renderer.xr.getController(i);
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -4)]), new THREE.LineBasicMaterial({ color: 0xffc93c }));
  c.add(line);
  c.addEventListener('selectstart', () => { if (input.down) return; activeController = c; audio(); press(); });
  c.addEventListener('selectend', () => { if (c === activeController) release(); });
  c.addEventListener('connected', (e) => { c.userData.src = e.data; });
  c.addEventListener('disconnected', () => { c.userData.src = null; });
  c.userData.samples = []; c.userData.vel = new THREE.Vector3();
  rig.add(c); return c;
});
let activeController = controllers[0];
const otherController = () => (activeController === controllers[0] ? controllers[1] : controllers[0]);
function trackHands() {
  const now = performance.now() / 1000;
  controllers.forEach((c) => {
    c.updateMatrixWorld();
    const p = new THREE.Vector3().setFromMatrixPosition(c.matrixWorld), s = c.userData.samples;
    s.push({ t: now, p }); while (s.length > 2 && now - s[1].t > 0.07) s.shift();
    const dt = now - s[0].t; if (dt > 0.005) c.userData.vel.copy(p).sub(s[0].p).divideScalar(dt);
  });
}
const handInfo = (c) => ({
  obj: c, pos: new THREE.Vector3().setFromMatrixPosition(c.matrixWorld), vel: c.userData.vel.clone(),
  quat: c.getWorldQuaternion(new THREE.Quaternion()), dir: new THREE.Vector3(0, 0, -1).transformDirection(c.matrixWorld),
  local: c.position.clone(), tracked: !!c.userData.src, handed: c.userData.src?.handedness,
});
function updateRay() {
  if (renderer.xr.isPresenting) {
    activeController.updateMatrixWorld();
    input.ray.origin.setFromMatrixPosition(activeController.matrixWorld);
    input.ray.direction.set(0, 0, -1).transformDirection(activeController.matrixWorld);
  } else { raycaster.setFromCamera(input.ndc, camera); input.ray.copy(raycaster.ray); }
}

// ---------- HUD ----------
let toastTimer = 0, hostTimer = 0;
const front = (d = 3) => camera.getWorldPosition(new THREE.Vector3()).add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(d));
const hud = {
  title: (t) => { $('hud-title').textContent = t; vrPanel.dirty = true; },
  info: (t) => { $('hud-info').innerHTML = t; vrPanel.info = t.replace(/<[^>]+>/g, ''); vrPanel.dirty = true; },
  score: (s, label = 'Score') => {
    const el = $('hud-score'); if (el.textContent !== String(s)) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
    el.textContent = s; $('hud-score-label').textContent = label; vrPanel.score = label + ' ' + s; vrPanel.dirty = true;
  },
  toast: (t, ms = 1100) => {
    const el = $('toast'); el.textContent = t; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), ms);
    vrPanel.toast = t; vrPanel.toastUntil = performance.now() + ms; vrPanel.dirty = true;
    if (renderer.xr.isPresenting && t.length < 22) fx.popup(t, front(2.5).add(new THREE.Vector3(0, 0.3, 0)));
  },
  power: (v, mark) => {
    const el = $('power');
    if (v == null) { el.classList.remove('on'); return; }
    el.classList.add('on'); $('power-fill').style.width = (v * 100).toFixed(1) + '%';
    const mk = $('power-mark');
    if (mark == null) mk.style.display = 'none'; else { mk.style.display = 'block'; mk.style.left = `calc(${(mark * 100).toFixed(1)}% - 2px)`; }
  },
  crosshair: (on) => $('crosshair').classList.toggle('on', !!on),
};
function showHost(h, line, ms = 7000) {
  const el = $('hud-host');
  el.querySelector('b').textContent = h.name; el.querySelector('span').textContent = line;
  el.querySelector('.av').style.background = hex(h.look.body);
  el.classList.add('show'); clearTimeout(hostTimer); hostTimer = setTimeout(() => el.classList.remove('show'), ms);
}
// in-headset HUD panel
const vrPanel = { canvas: document.createElement('canvas'), dirty: true, info: '', score: '', toast: '', toastUntil: 0 };
vrPanel.canvas.width = 1024; vrPanel.canvas.height = 256;
vrPanel.tex = new THREE.CanvasTexture(vrPanel.canvas); vrPanel.tex.colorSpace = THREE.SRGBColorSpace;
vrPanel.mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.2), new THREE.MeshBasicMaterial({ map: vrPanel.tex, transparent: true, depthTest: false, toneMapped: false }));
vrPanel.mesh.position.set(0, -0.32, -1); vrPanel.mesh.rotation.x = -0.3; vrPanel.mesh.renderOrder = 999; vrPanel.mesh.visible = false;
camera.add(vrPanel.mesh);
function drawVrPanel() {
  const g = vrPanel.canvas.getContext('2d');
  g.clearRect(0, 0, 1024, 256);
  g.fillStyle = 'rgba(255,244,220,.94)'; g.strokeStyle = '#123247'; g.lineWidth = 8;
  g.beginPath(); g.roundRect(8, 8, 1008, 240, 40); g.fill(); g.stroke();
  g.fillStyle = '#123247'; g.font = '900 54px sans-serif'; g.fillText($('hud-title').textContent, 40, 80);
  g.fillStyle = '#ff6b4f'; g.textAlign = 'right'; g.fillText(vrPanel.score, 984, 80); g.textAlign = 'left';
  g.fillStyle = '#123247'; g.font = '600 32px sans-serif';
  const show = performance.now() < vrPanel.toastUntil;
  g.fillText(show ? '★ ' + vrPanel.toast : (game?.finished ? 'Pull the trigger to play again' : vrPanel.info).slice(0, 58), 40, 170);
  vrPanel.tex.needsUpdate = true; vrPanel.dirty = false;
}

// ---------- context for sports ----------
const root = new THREE.Group(); scene.add(root);
let shakeAmt = 0;
const ctx = {
  THREE, scene, root, camera, input, hud, mesh: m, tex: TEX, fx,
  character: makeCharacter,
  sfx(n) {
    playSfx(n);
    if (n === 'cheer') { reactAll('cheer'); fx.confetti(front(4).add(new THREE.Vector3(0, 1.2, 0))); }
    else if (n === 'score') reactAll('happy');
    else if (n === 'miss') reactAll('sad');
    else if (n === 'boom') ctx.shake(0.8);
  },
  shake(a = 0.4) { shakeAmt = Math.max(shakeAmt, a); },
  waveY: (x, z) => world.waveHeight(x, z, elapsed),
  landY: (x, z) => world.landY(x, z),
  popup: (text, pos, color) => fx.popup(text, pos, color),
  attachToCamera: (o) => camAttach.add(o),
  get vr() { return renderer.xr.isPresenting; },
  hand: () => handInfo(activeController),
  offHand: () => handInfo(otherController()),
  hands: () => controllers.map(handInfo),
  buzz(v = 0.5, ms = 40, c = activeController) { try { c.userData.src?.gamepad?.hapticActuators?.[0]?.pulse?.(v, ms); } catch (e) { } },
  laser(on) { controllers.forEach((c) => { c.children[0].visible = on; }); },
  // In VR the rig stands on the floor (floorY) facing the target; on desktop the camera sits at pos.
  setView(pos, target, floorY = 0) {
    if (renderer.xr.isPresenting) {
      rig.position.set(pos.x, floorY, pos.z);
      rig.rotation.set(0, Math.atan2(pos.x - target.x, pos.z - target.z), 0);
    } else {
      rig.position.copy(pos); rig.rotation.set(0, 0, 0); camera.position.set(0, 0, 0);
      rig.updateMatrixWorld(); camera.lookAt(target);
    }
  },
  rayPlane(normal, point) { return input.ray.intersectPlane(new THREE.Plane().setFromNormalAndCoplanarPoint(normal, point), new THREE.Vector3()); },
  rayGround(y = 0) { return this.rayPlane(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, y, 0)); },
  aimYaw() { const d = input.ray.direction, v = new THREE.Vector3(d.x, 0, d.z); return v.lengthSq() < 1e-6 ? new THREE.Vector3(0, 0, -1) : v.normalize(); },
  finish(score, extra = '', won) {
    if (!game || game.finished) return;
    game.finished = true;
    const s = SPORTS[currentIndex], key = 'isla8-best-' + s.id;
    const prev = +(localStorage.getItem(key) || 0), best = Math.max(prev, score);
    localStorage.setItem(key, best);
    hud.power(null); hud.crosshair(false);
    const medal = medalFor(s.id, score), h = HOSTS[s.id];
    const good = won ?? (medal >= 2 || score > prev);
    setTimeout(() => {
      if (!game?.finished) return;
      $('end-sport').textContent = s.name + ' · final score';
      $('end-score').textContent = score;
      $('end-medal').textContent = MEDAL_ICON[medal] || '🎖️';
      $('end-medal').dataset.tier = medal;
      $('end-medal-name').textContent = medal ? MEDAL_NAME[medal] + ' medal' : `${MEDALS[s.id][0]} for bronze`;
      $('end-best').textContent = (score > prev ? '🏆 New personal best! ' : 'Personal best: ' + best + '. ') + extra;
      $('end-quote').innerHTML = `<i style="background:${hex(h.look.body)}"></i><b>${h.name}:</b> ${good ? h.win : h.lose}`;
      showHost(h, good ? h.win : h.lose, 6000);
      if (renderer.xr.isPresenting) hud.toast(h.name + ': ' + (good ? h.win : h.lose), 5000);
      else $('end').classList.remove('hidden');
      ctx.sfx(medal >= 2 || score > prev ? 'cheer' : medal ? 'score' : 'miss');
      if (medal === 3) setTimeout(() => fx.confetti(front(5).add(new THREE.Vector3(0, 2, 0)), 220), 400);
      hud.info('Session over! ' + extra);
    }, 900);
  },
};

// ---------- game manager ----------
let game = null, currentIndex = 0, menuT = 0;
function disposeTree(o) {
  o.traverse((n) => {
    n.geometry?.dispose();
    const mats = Array.isArray(n.material) ? n.material : n.material ? [n.material] : [];
    mats.forEach((mt) => { mt.map?.dispose(); mt.dispose(); });
  });
}
function clearSport() {
  game?.dispose?.(); game = null;
  disposeTree(root); root.clear(); root.position.set(0, 0, 0); root.rotation.set(0, 0, 0);
  clearCharacters(); fx.clear();
  disposeTree(camAttach); camAttach.clear();
  hud.power(null); hud.crosshair(false); ctx.laser(true);
  $('hud-host').classList.remove('show');
  camera.fov = 60; camera.updateProjectionMatrix();
}
function transition(fn) {
  if (renderer.xr.isPresenting) { fn(); return; }
  const f = $('fade'); f.classList.add('on');
  setTimeout(() => { fn(); requestAnimationFrame(() => setTimeout(() => f.classList.remove('on'), 60)); }, 320);
}
function startSport(i) { transition(() => buildSport(i)); }
function buildSport(i) {
  clearSport();
  currentIndex = i;
  const s = SPORTS[i], h = HOSTS[s.id];
  $('menu').classList.add('hidden'); $('end').classList.add('hidden'); $('hud').classList.remove('hidden');
  hud.title(s.emoji + ' ' + s.name); hud.info(renderer.xr.isPresenting ? VR_HOW[s.id] : s.how); hud.score(0);
  input.down = false;
  ctx.host = h;
  game = s.create(ctx); game.finished = false;
  if (h.pos) {
    const c = makeCharacter({ name: h.name, ...h.look });
    c.position.set(...h.pos); c.lookAt(h.face[0], h.pos[1], h.face[1]);
    root.add(c);
    if (h.raft) { const raft = m(new THREE.BoxGeometry(2.2, 0.3, 2.2), 0xffffff, { mat: { map: TEX.wood('#b88550', 5) } }); raft.position.set(h.pos[0], h.pos[1] - 0.15, h.pos[2]); raft.scale.x = 1.5; raft.position.x += 0.6; root.add(raft); }
  }
  if (h.josh) {
    const j = makeCharacter({ name: JOSH.name, ...JOSH.look });
    j.position.set(...h.josh); j.lookAt(h.face ? h.face[0] : 0, h.josh[1], h.face ? h.face[1] : h.josh[2] + 3);
    root.add(j);
  }
  showHost(h, h.hi);
  if (renderer.xr.isPresenting) hud.toast(h.name + ': ' + VR_HOW[s.id], 5000);
}
function showMenu() {
  if (renderer.xr.isPresenting) renderer.xr.getSession()?.end();
  transition(() => {
    clearSport();
    $('hud').classList.add('hidden'); $('end').classList.add('hidden'); $('menu').classList.remove('hidden');
    buildCards();
  });
}
function buildCards() {
  const wrap = $('cards'); wrap.innerHTML = '';
  let golds = 0, total = 0;
  SPORTS.forEach((s, i) => {
    const best = +(localStorage.getItem('isla8-best-' + s.id) || 0), medal = medalFor(s.id, best), h = HOSTS[s.id];
    if (medal === 3) golds++; total += medal;
    const b = document.createElement('button');
    b.className = 'card'; b.style.animationDelay = i * 55 + 'ms';
    b.innerHTML = `<span class="num">${String(i + 1).padStart(2, '0')}</span><span class="medal" data-tier="${medal}">${MEDAL_ICON[medal]}</span><div class="emoji">${s.emoji}</div><h2>${s.name}</h2><p>${s.blurb}</p>`
      + `<div class="host"><i style="background:${hex(h.look.body)}"></i>with <b>${h.name}</b> · ${h.from}</div>`
      + `<div class="card-foot"><span class="best">${best ? 'Best ' + best : 'Not played yet'}</span><span class="next">${medal < 3 ? MEDAL_ICON[medal + 1] + ' ' + MEDALS[s.id][medal] : '★ mastered'}</span></div>`;
    b.onclick = () => { audio(); playSfx('click'); startSport(i); };
    wrap.appendChild(b);
  });
  $('medal-count').innerHTML = `🥇 <b>${golds}</b>/${SPORTS.length} gold · <b>${total}</b>/${SPORTS.length * 3} medal points`;
  $('menu-host').querySelector('span').textContent = JOSH.menu;
  $('menu-host').querySelector('.av').style.background = hex(JOSH.look.body);
  const cast = [JOSH, ...Object.values(HOSTS)].filter((c, i, a) => a.findIndex((o) => o.name === c.name) === i);
  $('cast').innerHTML = '<span class="cast-label">The crew</span>' + cast.map((c, i) => `<span class="chip" style="animation-delay:${i * 40}ms"><i style="background:${hex(c.look.body)}"></i>${c.name}</span>`).join('');
}
function toggleMusic() { audio(); setMusic(!isMusicOn()); syncSettings(); }
function syncSettings() {
  document.querySelectorAll('[data-set="music"]').forEach((b) => b.classList.toggle('off', !isMusicOn()));
  document.querySelectorAll('[data-set="sfx"]').forEach((b) => b.classList.toggle('off', !isSfxOn()));
  document.querySelectorAll('[data-set="quality"]').forEach((b) => { b.classList.toggle('off', !quality.high); b.textContent = quality.high ? '✨ High' : '✨ Fast'; });
}
document.querySelectorAll('[data-set]').forEach((b) => b.addEventListener('click', () => {
  audio(); playSfx('click');
  const k = b.dataset.set;
  if (k === 'music') setMusic(!isMusicOn());
  if (k === 'sfx') setSfx(!isSfxOn());
  if (k === 'quality') {
    quality.high = !quality.high; localStorage.setItem('widr-quality', quality.high ? 'high' : 'low');
    renderer.setPixelRatio(Math.min(devicePixelRatio, quality.high ? 2 : 1.25)); world.setQuality(quality);
  }
  syncSettings();
}));
$('hud-menu').onclick = showMenu;
$('end-menu').onclick = showMenu;
$('end-again').onclick = () => startSport(currentIndex);

// ---------- VR ----------
const vrBtn = $('hud-vr');
if (navigator.xr?.isSessionSupported) {
  navigator.xr.isSessionSupported('immersive-vr').then((ok) => {
    $('vr-note').innerHTML = ok ? '🥽 <b>VR headset detected.</b> Pick a sport, then <b>Enter VR</b>. You really throw, swing and draw.'
      : '🥽 Open on a WebXR headset (e.g. Quest browser) to play with real motion.';
    vrBtn.classList.toggle('hidden', !ok);
  }).catch(() => { $('vr-note').textContent = '🖱️ Mouse & touch mode'; });
} else $('vr-note').innerHTML = '🖱️ Mouse & touch mode. Open on a WebXR headset to play in VR.';
// each sport builds itself differently in VR (real throwing/swinging), so rebuild it when entering or leaving
renderer.xr.addEventListener('sessionstart', () => { vrPanel.mesh.visible = true; vrPanel.dirty = true; controllers.forEach((c) => (c.userData.samples = [])); if (game) buildSport(currentIndex); });
renderer.xr.addEventListener('sessionend', () => { vrPanel.mesh.visible = false; camera.position.set(0, 0, 0); if (game) buildSport(currentIndex); });
vrBtn.onclick = async () => {
  try {
    const session = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor'] });
    renderer.xr.setReferenceSpaceType('local-floor');
    await renderer.xr.setSession(session);
  } catch (e) { hud.toast('VR unavailable', 1500); }
};
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

// ---------- loop ----------
const clock = new THREE.Clock();
let elapsed = 0;
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;
  input.ndcVel.multiplyScalar(Math.pow(0.02, dt));
  if (game) {
    if (renderer.xr.isPresenting) trackHands();
    updateRay();
    game.update(dt, elapsed);
    if (!renderer.xr.isPresenting) {
      if (shakeAmt > 0) { shakeAmt = Math.max(0, shakeAmt - dt * 1.6); const s = shakeAmt * 0.09; camera.position.set((Math.random() - 0.5) * s, (Math.random() - 0.5) * s, 0); }
      else if (camera.position.lengthSq() > 0) camera.position.set(0, 0, 0);
    }
    if (renderer.xr.isPresenting && (vrPanel.dirty || performance.now() < vrPanel.toastUntil + 100)) drawVrPanel();
  } else {
    // slow cinematic orbit behind the menu
    menuT += dt * 0.035;
    rig.rotation.set(0, 0, 0); camera.position.set(0, 0, 0);
    rig.position.set(30 + Math.sin(menuT) * 290, 115 + Math.sin(menuT * 0.7) * 20, -120 + Math.cos(menuT) * 290);
    camera.lookAt(30, 22, -120);
  }
  updateCharacters(dt, elapsed, camera);
  fx.update(dt);
  world.update(dt, elapsed, camera);
  renderer.render(scene, camera);
});
buildCards(); syncSettings();
