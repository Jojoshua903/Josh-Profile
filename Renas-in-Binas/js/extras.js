import { THREE, G, scene, camera, toon, basic, mk, surf, dirOf, tangentTo, orientOn, puff, clamp, $ } from './core.js?v=20261112i';
import { setVolume } from './audio.js?v=20261112i';
import { tr } from './lang.js?v=20261112i';
import { P, keys, pressed, mouse, cam } from './player.js?v=20261112i';

// Quality-of-life layer: a guide arrow to your next goal, light beams on collectibles, dust, a hurt flash,
// floating biome particles, volume settings and gamepad support.

// ---------- guide arrow ----------
const arrow = new THREE.Group();
{
  const m = toon(0xffe27a);
  const head = mk(new THREE.ConeGeometry(0.28, 0.55, 12), m, 0, 0, 0.35, arrow, 1.12); head.rotation.x = Math.PI / 2;
  const tail = mk(new THREE.CylinderGeometry(0.09, 0.09, 0.5, 10), m, 0, 0, -0.15, arrow, 1.15); tail.rotation.x = Math.PI / 2;
  arrow.traverse((o) => { o.frustumCulled = false; });
}
arrow.visible = false; scene.add(arrow);

function goal() {
  const cur = G.cur, w = cur && cur.w;
  // the compass upgrade from Knabbels Werkplaats: a golden gear close by wins over everything else
  if (G.compass && w && !cur.onArena && P.planet && w.pickups) {
    let best = null, bd = 24;
    for (const pk of w.pickups) if (pk.kind === 'rare' && !pk.taken && pk.planet === P.planet) { const d = pk.obj.position.distanceTo(P.pos); if (d < bd) { bd = d; best = pk; } }
    if (best) return { pos: best.obj.position, label: '⚙️' };
  }
  if (!w || cur.onArena || !P.planet || P.planet !== w.main || !w.quest) return null;
  if (w.nextStop !== undefined && w.rocket) return { pos: w.rocket.g.position, label: tr('your rocket') };   // a boss just went down: fly on
  const fs = w.friendState ? w.friendState() : 'new';
  const save = G.save && G.save();
  if (save && save.cleared[w.index]) return null;
  const friend = w.npcs[0];
  if (fs === 'new') return { pos: friend.g.position, label: w.friendName };
  if (fs !== 'done') {
    // everything still to do: the friend's items, the locals (talk, do the task, report back)
    const todo = [];
    if (w.quest.got < w.quest.need) {
      for (const pk of w.pickups) if (pk.kind === 'quest' && !pk.taken && pk.planet === P.planet) todo.push({ pos: pk.obj.position, label: tr(w.quest.label.replace(/s$/, '')) });
      const bot = w.enemies.find((e) => e.type === 'goldbot' && !e.dead);
      if (bot) todo.push({ pos: surf(bot.p, bot.dir, 0.5), label: tr('golden Kattenbot') });
    }
    for (const l of w.locals || []) {
      const s = l.state();
      if (s === 'new' || s === 'got') todo.push({ pos: l.npc.g.position, label: l.name });
      else if (s === 'progress' && l.task.type === 'fetch' && l.item && !l.item.taken) todo.push({ pos: l.item.obj.position, label: `${l.name}: ${tr(l.task.banner.replace('!', '').toLowerCase())}` });
      else if (s === 'progress' && l.task.type === 'duel') todo.push(l.duel ? { pos: l.duel.goal(), label: l.task.game === 'race' ? tr('the flag') : l.name } : { pos: l.npc.g.position, label: `${l.name}: ${tr('rematch')}` });
      else if (s === 'progress') for (const e of l.bugs) if (!e.dead) todo.push({ pos: surf(e.p, e.dir, 0.5), label: `${l.name}: ${tr('pests')}` });
    }
    if (todo.length) {
      let best = null, bd = 1e9;
      for (const g of todo) { const d = g.pos.distanceTo(P.pos); if (d < bd) { bd = d; best = g; } }
      return best;
    }
    return { pos: friend.g.position, label: w.friendName };
  }
  if (w.launchStar) return { pos: w.launchStar.ls.g.position, label: tr('Launch Star') };
  return { pos: friend.g.position, label: tr('home plate') };
}

// ---------- light beams over quest items and golden gears ----------
const BEAM = { quest: 0xffe27a, side: 0x9fe8ff, rare: 0xffd23a };
function beams() {
  const w = G.world; if (!w || !w.pickups) return;
  for (const pk of w.pickups) {
    if (pk.beam || !BEAM[pk.kind]) continue;
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 16, 14, 1, true), basic(BEAM[pk.kind], { transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    b.position.y = 8; pk.obj.add(b); pk.beam = b;
  }
}

// ---------- floating particles per biome ----------
const AMB = { milo: [0xff5ab4, 0x5ef2e0, 0xffd23a], lars: [0xffd36a, 0xd8b890, 0x5ef2e0], nathan: [0xffffff, 0xfff2a8, 0x9aff6a], deniz: [0xffffff, 0x9fe8ff, 0x7dfcff], fionn: [0x5cd85a, 0xffd23a, 0xffffff], reshman: [0x5cc84a, 0xffd23a, 0xff5ab4], lotte: [0xff7a2a, 0xffd23a, 0x8a7a7a], farah: [0xffe8b0, 0xe0b070, 0xffffff], kosmo: [0xffffff, 0x9fe8ff, 0xc8b0ff], sami: [0xe8fbff, 0x9fe8ff, 0xff9ac8], saar: [0x7dffb0, 0x9a7aff, 0xffe14a], intro: [0xffffff, 0xc8b0ff, 0x7ac8ff], zweef: [0xff7ad8, 0x5ef2e0, 0xb07aff] };
let amb = null, ambId = null;
const AMB_N = 140, AMB_R = 16;
function makeAmb(id) {
  if (amb) scene.remove(amb);
  const cols = AMB[id] || AMB.intro, pos = new Float32Array(AMB_N * 3), col = new Float32Array(AMB_N * 3), c = new THREE.Color();
  for (let i = 0; i < AMB_N; i++) {
    pos.set([(Math.random() - 0.5) * 2 * AMB_R, (Math.random() - 0.5) * 2 * AMB_R, (Math.random() - 0.5) * 2 * AMB_R], i * 3);
    c.setHex(cols[i % cols.length]); col.set([c.r, c.g, c.b], i * 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  amb = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.14, vertexColors: true, transparent: true, opacity: 0.75, depthWrite: false }));
  amb.frustumCulled = false; amb.userData.seed = Array.from({ length: AMB_N }, () => Math.random() * 6.28);
  scene.add(amb); ambId = id;
}
function updateAmb(dt, t) {
  const id = G.world ? G.world.id : null;
  if (id !== ambId) makeAmb(id);
  if (!amb) return;
  // keep the cloud round the camera: wrap points that drift out of the box
  const a = amb.geometry.attributes.position.array, cp = camera.position, s = amb.userData.seed;
  for (let i = 0; i < AMB_N; i++) {
    const k = i * 3;
    a[k] += Math.sin(t * 0.7 + s[i]) * dt * 0.4; a[k + 1] += Math.cos(t * 0.5 + s[i]) * dt * 0.4; a[k + 2] += Math.sin(t * 0.6 + s[i] * 2) * dt * 0.4;
    for (let j = 0; j < 3; j++) {
      const rel = a[k + j] - cp.getComponent(j);
      if (rel > AMB_R) a[k + j] -= AMB_R * 2; else if (rel < -AMB_R) a[k + j] += AMB_R * 2;
    }
  }
  amb.geometry.attributes.position.needsUpdate = true;
}

// ---------- dust + hurt flash ----------
let dustT = 0, lastHp = 3;
function feel(dt) {
  const hs = P.vt.length();
  dustT -= dt;
  if (P.grounded && hs > 5 && dustT <= 0 && P.planet) { dustT = 0.11; puff(P.pos.clone().addScaledVector(P.up, 0.08).addScaledVector(P.fwd, -0.25), 1, 0xffffff, 1.2, 0.5); }
  if (P.hp < lastHp) { const h = $('hurt'); h.classList.remove('on'); void h.offsetWidth; h.classList.add('on'); }
  lastHp = P.hp;
  $('hurt').classList.toggle('low', P.hp === 1 && G.state === 'play' && !!(G.cur && G.cur.w));
}

// ---------- volume ----------
const VKEY = 'renas-rocket-rumble-volume';
let vol = { m: 0.3, s: 0.55 };
try { vol = { ...vol, ...JSON.parse(localStorage.getItem(VKEY)) }; } catch (e) { /* defaults */ }
const vm = $('volM'), vs = $('volS');
if (vm && vs) {
  vm.value = vol.m; vs.value = vol.s;
  const apply = () => { vol = { m: +vm.value, s: +vs.value }; setVolume(vol.m, vol.s); try { localStorage.setItem(VKEY, JSON.stringify(vol)); } catch (e) { /* ignore */ } };
  vm.oninput = apply; vs.oninput = apply;
}

// ---------- gamepad (standard layout) ----------
// left stick: move · right stick: camera · A: jump · B: crouch/long jump · X: spin · Y: talk · RB/RT: sprint · LB: ground pound · LT: Komeetduik · Start: pause
const padHeld = new Set();
const prevBtn = [];
function padKey(code, on) {
  if (on) { if (!padHeld.has(code)) { padHeld.add(code); keys.add(code); pressed.add(code); } }
  else if (padHeld.has(code)) { padHeld.delete(code); keys.delete(code); }
}
export function pollPad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const gp = pads && Array.from(pads).find((p) => p && p.connected);
  if (!gp) return;
  const ax = gp.axes, b = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
  const dz = 0.35;
  padKey('KeyW', ax[1] < -dz); padKey('KeyS', ax[1] > dz); padKey('KeyA', ax[0] < -dz); padKey('KeyD', ax[0] > dz);
  const rx = Math.abs(ax[2]) > 0.15 ? ax[2] : 0, ry = Math.abs(ax[3]) > 0.15 ? ax[3] : 0;
  mouse.dx += rx * 14; mouse.dy += ry * 10;
  padKey('Space', b(0)); padKey('KeyC', b(1)); padKey('KeyF', b(2)); padKey('KeyE', b(3));
  padKey('ShiftLeft', b(5) || b(7)); padKey('KeyX', b(6));
  if (b(4) && !prevBtn[4]) pressed.add('KeyC');
  if (b(9) && !prevBtn[9]) { dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyP' })); dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyP' })); }
  for (let i = 0; i < gp.buttons.length; i++) prevBtn[i] = b(i);
}

// ---------- minimap ----------
// A round map in the corner, turned with the camera (up on the map = where the camera looks).
// Distances on your own planet are measured over the ground; other planets and moons show as circles.
// M switches it on and off.
const MKEY = 'renas-rocket-rumble-minimap';
let mapOn = true;
try { mapOn = localStorage.getItem(MKEY) !== 'off'; } catch (e) { /* default on */ }
addEventListener('keydown', (e) => {
  if (e.code !== 'KeyM' || e.ctrlKey || e.metaKey || e.repeat || G.state !== 'play') return;
  mapOn = !mapOn; try { localStorage.setItem(MKEY, mapOn ? 'on' : 'off'); } catch (er) { /* ignore */ }
});
const MAP_R = 48;   // metres from the middle to the edge
const mR = new THREE.Vector3(), mF = new THREE.Vector3(), mT = new THREE.Vector3();
// where a point lands on the map, in metres: [right, forward]
function mapXY(pos, pl) {
  if (pl && pl === P.planet) {
    const d = dirOf(pl, pos), c = clamp(d.dot(P.up), -1, 1), ang = Math.acos(c) * pl.r;
    mT.copy(d).addScaledVector(P.up, -c);
    const l = mT.length(); if (l < 1e-6) return [0, 0];
    return [mT.dot(mR) / l * ang, mT.dot(mF) / l * ang];
  }
  mT.copy(pos).sub(P.pos);
  return [mT.dot(mR), mT.dot(mF)];
}
function drawMap(gl) {
  const cv = $('minimap'); if (!cv) return;
  const w = G.world, show = mapOn && G.state === 'play' && !G.cutscene && w && P.planet;
  cv.style.display = show ? 'block' : 'none';
  if (!show) return;
  const S = 160, H = S / 2, k = (H - 8) / MAP_R, x = cv.getContext('2d');
  mF.copy(cam.fwd).addScaledVector(P.up, -cam.fwd.dot(P.up)).normalize();
  mR.crossVectors(mF, P.up).normalize();
  const at = (pos, pl) => { const [a, b] = mapXY(pos, pl); return [H + a * k, H - b * k, Math.hypot(a, b)]; };
  x.clearRect(0, 0, S, S);
  x.save(); x.beginPath(); x.arc(H, H, H, 0, 6.2832); x.clip();
  // rings every 16 m
  x.strokeStyle = 'rgba(255,248,236,.13)'; x.lineWidth = 1.5;
  for (let r = 16; r < MAP_R; r += 16) { x.beginPath(); x.arc(H, H, r * k, 0, 6.2832); x.stroke(); }
  // other planets and moons close by
  for (const pl of w.planets || []) {
    if (pl === P.planet) continue;
    const [px, py] = at(pl.c, null);
    x.fillStyle = 'rgba(158,200,255,.22)'; x.strokeStyle = 'rgba(158,200,255,.6)'; x.lineWidth = 2;
    x.beginPath(); x.arc(px, py, Math.max(3, pl.r * k), 0, 6.2832); x.fill(); x.stroke();
  }
  const dot = (pos, pl, col, r, ring) => {
    const [px, py, d] = at(pos, pl); if (d > MAP_R + 4) return;
    x.fillStyle = col; x.beginPath(); x.arc(px, py, r, 0, 6.2832); x.fill();
    if (ring) { x.strokeStyle = '#2b2440'; x.lineWidth = 2; x.stroke(); }
  };
  // things to pick up (golden gears only with the compass, so they stay a secret)
  for (const pk of w.pickups || []) {
    if (pk.taken) continue;
    if (pk.kind === 'quest') dot(pk.obj.position, pk.planet, '#ffe27a', 3.5, true);
    else if (pk.kind === 'rare' && G.compass) dot(pk.obj.position, pk.planet, '#ffd23a', 4, true);
  }
  // baddies
  for (const e of w.enemies || []) if (!e.dead && e.m && e.m.g) dot(e.m.g.position, e.p, '#ff5a6e', 3, false);
  // friends and locals: the ones with something for you are yellow
  const busy = new Set();
  for (const l of w.locals || []) { const s = l.state(); if (s !== 'done') busy.add(l.npc); }
  for (const n of w.npcs || []) dot(n.g.position, n.planet, busy.has(n) ? '#ffd23a' : '#fff8ec', busy.has(n) ? 4.5 : 3.5, true);
  if (w.launchStar) dot(w.launchStar.ls.g.position, P.planet, '#7dfcff', 4.5, true);
  // the goal: a star, stuck to the edge when it's further away
  if (gl) {
    let [px, py, d] = at(gl.pos, P.planet);
    if (d > MAP_R) { const a = Math.atan2(py - H, px - H); px = H + Math.cos(a) * (H - 9); py = H + Math.sin(a) * (H - 9); }
    x.save(); x.translate(px, py); x.fillStyle = '#ffe27a'; x.strokeStyle = '#2b2440'; x.lineWidth = 2.5; x.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 3.2 : 7.5, a = -Math.PI / 2 + i * Math.PI / 5; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    x.closePath(); x.stroke(); x.fill(); x.restore();
  }
  x.restore();
  // you: an arrow in the middle, pointing where Rênas faces
  const fa = Math.atan2(P.fwd.dot(mR), P.fwd.dot(mF));
  x.save(); x.translate(H, H); x.rotate(fa);
  x.fillStyle = '#ff7a3d'; x.strokeStyle = '#2b2440'; x.lineWidth = 2.5; x.lineJoin = 'round';
  x.beginPath(); x.moveTo(0, -9); x.lineTo(7, 7); x.lineTo(0, 3.5); x.lineTo(-7, 7); x.closePath(); x.stroke(); x.fill();
  x.restore();
}

// ---------- per frame ----------
export function updateExtras(dt, t) {
  setVolume(vol.m, vol.s);
  updateAmb(dt, t);
  beams();
  feel(dt);
  const gEl = $('goal');
  const gl = G.state === 'play' && !G.cutscene ? goal() : null;
  drawMap(gl);
  if (!gl) { arrow.visible = false; gEl.style.display = 'none'; return; }
  const d = dirOf(P.planet, gl.pos), dist = Math.acos(clamp(d.dot(P.up), -1, 1)) * P.planet.r;
  gEl.style.display = 'flex'; gEl.textContent = `➜ ${gl.label} · ${Math.round(dist)} m`;
  arrow.visible = false;   // the 3D arrow above Rênas' head is switched off: the goal text on screen is enough
}
