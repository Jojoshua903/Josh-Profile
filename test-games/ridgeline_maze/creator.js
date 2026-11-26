// Ridgeline character creator: a live 3D turntable plus the option controls.
// The same block is shown on the main menu ("Your climber") and in the Base Camp gear locker.
import { THREE } from './world.js';
import { makeClimber, animateRig, disposeClimber, normLook, faceThumb, HATS, OUTFITS, EYES, MOUTHS, BROWS, CHEEKS, SKINS } from './rig.js';

export const JACKETS = ['#ff6f59', '#ffd23f', '#2ec4f1', '#8ee34d', '#ff5fa2', '#a37bff', '#ff9f1c', '#3ddc97', '#ffffff', '#1b2738'];
const ACCENTS = ['#ffd23f', '#ff6f59', '#2ec4f1', '#8ee34d', '#ff5fa2', '#a37bff', '#ffffff', '#1b2738'];
const PANTS = ['#33405a', '#1b2738', '#5a3b25', '#2f5d4a', '#7a2f3a', '#8a8f9c', '#c9a36a', '#3b5bdb'];
const GLOVES = ['#27303b', '#ff6f59', '#ffd23f', '#2ec4f1', '#8ee34d', '#ffffff', '#a37bff', '#5a3b25'];
const GOGGLES = ['#1b2738', '#2ec4f1', '#ff9f1c', '#a37bff', '#ff5fa2', 'none'];
const NAMES = {
  eyes: { round: 'Round', dot: 'Dots', happy: 'Happy', sleepy: 'Sleepy', fierce: 'Fierce', wink: 'Wink', lashes: 'Lashes' },
  mouth: { smile: 'Smile', grin: 'Grin', open: 'Oh!', flat: 'Flat', smirk: 'Smirk', teeth: 'Toothy', cat: 'Kitty' },
  brows: { soft: 'Soft', bold: 'Bold', worried: 'Worried', angry: 'Grumpy', none: 'None' },
  cheeks: { blush: 'Blush', freckles: 'Freckles', none: 'Plain' },
};
const $ = (id) => document.getElementById(id);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

/* ================= the 3D turntable ================= */
let ren = null, scn, cam, holder, mesh = null, yaw = .35, spin = 0, drag = null, wave = 0, joy = 0, hop = 0, hopV = 0, t = 0, last = 0;
function initStage() {
  if (ren) return;
  const canvas = $('cPreview');
  ren = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  ren.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  ren.shadowMap.enabled = true; ren.shadowMap.type = THREE.PCFSoftShadowMap;
  ren.toneMapping = THREE.ACESFilmicToneMapping; ren.toneMappingExposure = 1.1;
  scn = new THREE.Scene();
  scn.add(new THREE.HemisphereLight(0xfff1e0, 0x8899bb, 1.5));
  const key = new THREE.DirectionalLight(0xffe2c0, 2.4); key.position.set(-2.5, 5, -3.5); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -2, right: 2, top: 3, bottom: -1, near: .5, far: 15 }); scn.add(key);
  const rim = new THREE.DirectionalLight(0x9fd8ff, 1.4); rim.position.set(3, 3, 4); scn.add(rim);
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.08, .24, 40), new THREE.MeshStandardMaterial({ color: 0xf6f8fb, roughness: .9 }));
  ped.position.y = -.12; ped.receiveShadow = true; scn.add(ped);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.04, .045, 8, 48), new THREE.MeshStandardMaterial({ color: 0xff6f59, roughness: .6 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = -.02; scn.add(ring);
  holder = new THREE.Group(); scn.add(holder);
  cam = new THREE.PerspectiveCamera(30, 1, .1, 50); cam.position.set(0, 1.55, -5.2); cam.lookAt(0, .95, 0);
  // drag to spin the climber
  canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, yaw }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => { if (drag) { yaw = drag.yaw + (e.clientX - drag.x) * .012; spin = 0; } });
  const up = () => { if (drag) spin = 0; drag = null; };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('dblclick', () => { hopV = 3.4; });
  requestAnimationFrame(loop);
}
function loop(now) {
  requestAnimationFrame(loop);
  const c = ren.domElement, w = c.clientWidth, h = c.clientHeight;
  if (!w || !h || !c.offsetParent) { last = now; return; }
  const dt = Math.min(.05, (now - (last || now)) / 1000); last = now; t += dt;
  if (c.width !== Math.round(w * ren.getPixelRatio()) || c.height !== Math.round(h * ren.getPixelRatio())) { ren.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  if (!drag) { spin += dt; yaw += Math.sin(t * .5) * dt * .12; }
  holder.rotation.y = yaw;
  // little hop when something changes
  hopV -= 14 * dt; hop = Math.max(0, hop + hopV * dt); if (hop === 0 && hopV < 0) hopV = 0;
  holder.position.y = hop;
  wave = Math.max(0, wave - dt); joy = Math.max(0, joy - dt);
  if (mesh) animateRig(mesh, { speed: 0, ground: hop <= .001, vy: hopV, wave, joy: joy > 0 }, dt);
  ren.render(scn, cam);
}
function showLook(look) {
  if (mesh) { holder.remove(mesh); disposeClimber(mesh); }
  mesh = makeClimber(look.jacket, '', look); holder.add(mesh);
  hopV = Math.max(hopV, 2.2);
}

/* ================= the controls ================= */
let cur = null, onChange = null, tab = 'body';
export function openCreator(host, { look, onChange: cb, who = null }) {
  const block = $('creatorBlock'); host.appendChild(block);
  initStage();
  cur = normLook(look); onChange = cb;
  const w = $('cWho');
  if (who && who.names.length > 1) {
    w.style.display = 'flex';
    w.innerHTML = who.names.map((n, i) => `<button class="hatb${i === who.index ? ' on' : ''}" data-i="${i}">${n}</button>`).join('');
    w.querySelectorAll('button').forEach((b) => b.onclick = () => who.onPick(+b.dataset.i));
  } else w.style.display = 'none';
  showLook(cur); render();
}
function set(k, v) {
  cur = normLook({ ...cur, [k]: v });
  showLook(cur); render(); onChange?.(cur);
}
const sw = (k, list, extra = []) => `<div class="sws">${extra.concat(list).map((c) => {
  const on = (cur[k] || '') === c, cls = c === 'none' ? ' none' : c === '' ? ' match' : '';
  return `<button class="sw${on ? ' on' : ''}${cls}" data-k="${k}" data-v="${c}" style="--c:${c && c !== 'none' ? c : '#fff'}" title="${c === '' ? 'Match jacket' : c === 'none' ? 'None' : c}"></button>`;
}).join('')}</div>`;
const faces = (k, list) => `<div class="chips">${list.map((v) => `<button class="fchip${cur[k] === v ? ' on' : ''}" data-k="${k}" data-v="${v}"><img src="${faceThumb({ ...cur, [k]: v }, 64)}" alt=""><span>${NAMES[k][v]}</span></button>`).join('')}</div>`;
const chips = (k, names) => `<div class="chips">${names.map((n, i) => `<button class="hatb${cur[k] === i ? ' on' : ''}" data-k="${k}" data-v="${i}" data-num="1">${n}</button>`).join('')}</div>`;
const slider = (k, label, min, max) => `<div class="cslider"><span>${label}</span><input type="range" min="${min}" max="${max}" step="0.01" value="${cur[k]}" data-k="${k}" data-range="1"></div>`;
const row = (label, html) => `<div class="lkrow"><label>${label}</label>${html}</div>`;
function render() {
  document.querySelectorAll('#cTabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  const P = {
    body: row('Body colour', sw('skin', SKINS)) + row('Build', slider('h', 'Short · Tall', .86, 1.16) + slider('w', 'Slim · Chunky', .82, 1.25)),
    face: row('Eyes', faces('eyes', EYES)) + row('Mouth', faces('mouth', MOUTHS)) + row('Brows', faces('brows', BROWS)) + row('Cheeks', faces('cheeks', CHEEKS)),
    outfit: row('Outfit', chips('outfit', OUTFITS)) + row('Jacket colour', sw('jacket', JACKETS)) + row('Trousers', sw('pants', PANTS)) + row('Mittens', sw('gloves', GLOVES)),
    gear: row('Hat', chips('hat', HATS)) + row('Hat colour', sw('hatc', ACCENTS, [''])) + row('Scarf', sw('scarf', ACCENTS, ['none'])) + row('Backpack', sw('pack', ACCENTS, ['', 'none'])) + row('Goggles', sw('goggles', GOGGLES)),
  };
  const pane = $('cPane'); pane.innerHTML = P[tab];
  pane.querySelectorAll('button[data-k]').forEach((b) => b.onclick = () => set(b.dataset.k, b.dataset.num ? +b.dataset.v : b.dataset.v));
  pane.querySelectorAll('input[data-range]').forEach((r) => {
    r.oninput = () => { cur = normLook({ ...cur, [r.dataset.k]: +r.value }); if (mesh) mesh.scale.set(cur.w, cur.h, cur.w); };
    r.onchange = () => set(r.dataset.k, +r.value);
  });
}
document.querySelectorAll('#cTabs button').forEach((b) => b.onclick = () => { tab = b.dataset.tab; render(); });
$('cRandom').onclick = () => {
  cur = normLook({
    skin: pick(SKINS), eyes: pick(EYES), mouth: pick(MOUTHS), brows: pick(BROWS), cheeks: pick(CHEEKS), outfit: Math.floor(Math.random() * OUTFITS.length),
    jacket: pick(JACKETS), pants: pick(PANTS), gloves: pick(GLOVES), hat: Math.floor(Math.random() * HATS.length), hatc: pick(['', ...ACCENTS]),
    scarf: pick(['none', ...ACCENTS]), pack: pick(['', 'none', ...ACCENTS]), goggles: pick(GOGGLES), w: .88 + Math.random() * .3, h: .9 + Math.random() * .22,
  });
  showLook(cur); joy = 1.2; render(); onChange?.(cur);
};
$('cWave').onclick = () => { wave = 2.2; };
$('cCheer').onclick = () => { joy = 1.6; hopV = 3.2; };
$('cReset').onclick = () => { cur = normLook({ jacket: cur.jacket }); showLook(cur); render(); onChange?.(cur); };
