import { THREE, G, renderer, scene, camera, anyPerp, $, toast, toon, mk } from './core.js?v=20261114j';
import { initAudio } from './audio.js?v=20261114j';
import { tr, LANG } from './lang.js?v=20261114j';
import { P, keys, pressed, cam, model } from './player.js?v=20261114j';

// VR on the Meta Quest (WebXR).
// - An "Enter VR" button shows up only when the browser can do immersive VR, so on a normal computer nothing changes.
// - The game loop runs through renderer.setAnimationLoop: on a normal screen that is the same as requestAnimationFrame,
//   in the headset it follows the headset's refresh rate and draws both eyes.
// - In VR you stand where the game camera is, like a giant watching Rênas from behind (as in Astro Bot):
//   your head looks around freely, the right stick turns in steps, and the view never swings on its own.
// - The HTML (dialogue, prompts, menus) can't be seen in a headset, so a floating panel shows it,
//   and menus are worked with the sticks and the trigger.
//
// Touch controllers
//   left stick: walk (push all the way = sprint)   right stick: turn in steps of 30°
//   right trigger / A: jump, next line             right grip: spin
//   left trigger: Komeetduik                       left grip: crouch / ground pound
//   B or X: talk / use                             Y: pause (in a cutscene: skip)
//   🥽 VR settings (in the pause menu): turning, comfort vignette, seated, watch, left-handed, stars, silhouette, minimap
// While you play you always look through Rênas's helmet (1st person); cutscenes use the game's own camera.
//   menus: either stick up/down = choose · trigger or A = OK · B = back
// With hand tracking a pinch is the same as the trigger.

const EYE = 1.5;           // the headset adds your real eye height (about 1.5 m) on top of the rig
// 1st person: you stand inside Rênas. He is a kid, so the rig is shrunk: your real eye height (about 1.5 m)
// then lands at the height of his eyes, and the world around you looks as big as it does to him.
const FP_SCALE = 0.68;
// ---------- VR settings (saved in this browser, apart from the saves) ----------
const SET_KEY = 'renas-rocket-rumble-vr';
const DEF = { turn: 30, comfort: 1, seated: false, sil: true, stars: true, hud: 'wrist', lefty: false };
const S = Object.assign({}, DEF);
try { Object.assign(S, JSON.parse(localStorage.getItem(SET_KEY) || '{}')); } catch (e) { /* defaults */ }
G.vrSet = S;   // main.js reads S.sil (Rênas's silhouette behind walls)
const saveSet = () => { try { localStorage.setItem(SET_KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } };
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local-floor');

const nl = () => LANG.cur === 'nl';
const rig = new THREE.Group();
let session = null, saved = null;

// ---------- the loop ----------
export function startLoop(frame) { renderer.setAnimationLoop(frame); }

// ---------- the page underneath keeps working ----------
// While the headset shows VR, the Quest browser stops updating the web page under it:
//  - requestAnimationFrame callbacks never run (the planet picker, some boss effects and fades wait on them)
//  - CSS transitions and animations stop moving, so things fading in or out (the black fade between planets,
//    toasts, menu panels) can stay stuck half-way or invisible, and the VR view reads that stuck state.
// So in VR: requestAnimationFrame callbacks run from the headset's own frames, and CSS transitions/animations are
// switched off (everything jumps straight to where it was going). The VR view does its own smooth fades instead.
const nativeRAF = window.requestAnimationFrame.bind(window), rafQ = [];
window.requestAnimationFrame = (cb) => {
  if (renderer.xr.isPresenting) { rafQ.push(cb); return -1; }
  return nativeRAF(cb);
};
function flushRAF() { if (!rafQ.length) return; const q = rafQ.splice(0), now = performance.now(); for (const cb of q) { try { cb(now); } catch (e) { setTimeout(() => { throw e; }); } } }
const noAnim = document.createElement('style');
noAnim.textContent = 'html.vrOn *,html.vrOn *::before,html.vrOn *::after{transition:none!important;animation:none!important}';
document.head.appendChild(noAnim);

// ---------- the Enter VR button ----------
const btn = document.createElement('button');
btn.id = 'vrBtn';
btn.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:60;display:none;padding:12px 18px;border:0;border-radius:14px;font:800 16px system-ui,sans-serif;color:#1a1030;background:#ffd23a;box-shadow:0 4px 0 #b08a10,0 8px 20px rgba(0,0,0,.35);cursor:pointer';
const label = () => (btn.textContent = session ? (nl() ? '🥽 Stop VR' : '🥽 Exit VR') : (nl() ? '🥽 Start VR' : '🥽 Enter VR'));
document.body.appendChild(btn);
if (navigator.xr && navigator.xr.isSessionSupported) {
  navigator.xr.isSessionSupported('immersive-vr').then((ok) => { if (ok) { label(); btn.style.display = 'block'; setBtn.style.display = ''; vrButtons(); } }).catch(() => {});
}
btn.onclick = async () => {
  initAudio();
  if (session) { session.end(); return; }
  try {
    const s = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'] });
    await renderer.xr.setSession(s);
    begin(s);
  } catch (e) { btn.textContent = nl() ? '🥽 VR lukt niet' : '🥽 VR failed'; setTimeout(label, 2500); }
};

const sel = { left: false, right: false }, sqz = { left: false, right: false };
const vmF = new THREE.Vector3(), vmR = new THREE.Vector3();   // where your head looks, flat on the planet
function begin(s) {
  session = s; G.vr = true; label();
  document.documentElement.classList.add('vrOn');   // CSS transitions and animations off (see above)
  saved = { fov: camera.fov, aspect: camera.aspect, bg: scene.background };
  if (document.pointerLockElement) document.exitPointerLock();
  try { renderer.xr.setFoveation(0.25); } catch (e) { /* not every browser */ }   // only a little: at full strength the edges of the view go blurry
  scene.add(rig); scene.add(fx); scene.add(stars); scene.add(bubG); applySet();
  s.addEventListener('selectstart', (e) => (sel[e.inputSource.handedness] = true));
  s.addEventListener('selectend', (e) => (sel[e.inputSource.handedness] = false));
  s.addEventListener('squeezestart', (e) => (sqz[e.inputSource.handedness] = true));
  s.addEventListener('squeezeend', (e) => (sqz[e.inputSource.handedness] = false));
  s.addEventListener('end', finish);
}
function finish() {
  session = null; G.vr = false; label();
  document.documentElement.classList.remove('vrOn'); flushRAF();
  releaseAll(); G.vrMove = null;
  sel.left = sel.right = sqz.left = sqz.right = false;
  scene.remove(rig); scene.remove(fx); scene.remove(stars); scene.remove(bubG); rig.scale.setScalar(1); skyKey = '';
  scene.background = saved ? saved.bg : null;
  if (saved) { camera.fov = saved.fov; camera.aspect = saved.aspect; }
  camera.updateProjectionMatrix();
}

// ---------- the camera rig ----------
// Before drawing: put the rig where the game camera is (upright on the planet, facing the way the game camera faces)
// and hang the camera in it, so the headset moves your view from there. After drawing everything goes back, so the
// rest of the game still sees its own camera.
const sp = new THREE.Vector3(), sq = new THREE.Quaternion(), su = new THREE.Vector3();
const _u = new THREE.Vector3(), _f = new THREE.Vector3(), _b = new THREE.Vector3(), _x = new THREE.Vector3(), _m = new THREE.Matrix4();
function setRig(pos, up, fwd, feet = false, scale = 1) {
  _u.copy(up).normalize();
  _f.copy(fwd).addScaledVector(_u, -fwd.dot(_u));
  if (_f.lengthSq() < 1e-6) _f.copy(anyPerp(_u));
  _f.normalize();
  _b.copy(_f).negate();            // a camera looks down -Z, so the rig's +Z points backwards
  _x.crossVectors(_u, _b);
  _m.makeBasis(_x, _u, _b);
  rig.quaternion.setFromRotationMatrix(_m);
  rig.scale.setScalar(scale);
  rig.position.copy(pos);
  if (!feet) rig.position.addScaledVector(_u, -EYE * scale);
  if (S.seated) rig.position.addScaledVector(_u, 0.45 * scale);   // sitting down: lift the rig, so your eyes end up where they would be standing
}
let modelWas = true;
const _lk = new THREE.Vector3(), _hf = new THREE.Vector3();
export function vrBegin() {
  if (!G.vr || !renderer.xr.isPresenting) return false;
  sp.copy(camera.position); sq.copy(camera.quaternion); su.copy(camera.up);
  const playing = (G.state === 'play' || G.state === 'over') && !G.cutscene;
  modelWas = model.root.visible;
  if (playing && P.planet && !P.hidden) {
    // while you play you are always Rênas: the rig stands on his feet, facing the camera's heading, and you
    // don't see his body (his shadow stays, so you can still see where you'll land)
    setRig(P.pos, P.up, cam.fwd, true, FP_SCALE);
    model.root.visible = false;
  }
  // cutscenes, flights and menus: you stand where the game's own camera is
  else setRig(camera.position, camera.up, _f.set(0, 0, -1).applyQuaternion(camera.quaternion));
  rig.add(camera);
  camera.position.set(0, 0, 0); camera.quaternion.identity(); camera.up.set(0, 1, 0);
  rig.updateMatrixWorld(true);
  placeFx();
  return true;
}
export function vrEnd() {
  rig.remove(camera);
  model.root.visible = modelWas;
  camera.position.copy(sp); camera.quaternion.copy(sq); camera.up.copy(su);
  camera.updateMatrixWorld();
}

// ---------- the VR settings menu ----------
// A normal menu page (so the VR menu control works on it), opened from the pause menu in VR, or from ⚙️ Settings
// on a computer that can do VR. Every button switches one setting to its next choice.
const OPTS = [
  ['turn', [30, 45, 90, 0], (v) => (nl() ? `🔄 Draaien: ${v ? `stappen van ${v}°` : 'vloeiend'}` : `🔄 Turning: ${v ? `steps of ${v}°` : 'smooth'}`)],
  ['comfort', [0, 1, 2], (v) => (nl() ? `🌫 Comfortrand bij bewegen: ${['uit', 'zacht', 'sterk'][v]}` : `🌫 Comfort vignette when moving: ${['off', 'soft', 'strong'][v]}`)],
  ['seated', [false, true], (v) => (nl() ? `🪑 Zittend spelen: ${v ? 'aan' : 'uit'}` : `🪑 Play seated: ${v ? 'on' : 'off'}`)],
  ['hud', ['wrist', 'front'], (v) => (nl() ? `⌚ Hartjes en bouten: ${v === 'wrist' ? 'op je pols' : 'zwevend voor je'}` : `⌚ Hearts and bolts: ${v === 'wrist' ? 'on your wrist' : 'floating in front'}`)],
  ['lefty', [false, true], (v) => (nl() ? `✋ Linkshandig (sticks en knoppen omgewisseld): ${v ? 'aan' : 'uit'}` : `✋ Left-handed (sticks and buttons swapped): ${v ? 'on' : 'off'}`)],
  ['stars', [true, false], (v) => (nl() ? `✨ Sterrenhemel: ${v ? 'aan' : 'uit'}` : `✨ Starry sky: ${v ? 'on' : 'off'}`)],
  ['sil', [true, false], (v) => (nl() ? `👻 Rênas zien achter muren: ${v ? 'aan' : 'uit (sneller)'}` : `👻 See Rênas behind walls: ${v ? 'on' : 'off (faster)'}`)],
];
const setOv = document.createElement('div');
setOv.id = 'vrSettings'; setOv.className = 'overlay';
setOv.innerHTML = '<div class="center"><div class="bigword"></div><div class="vrOpts" style="display:flex;flex-direction:column;gap:10px;max-width:560px;margin:0 auto"></div><button class="btn primary" id="btnVrSetBack" style="margin-top:14px"></button><button class="btn small" id="btnVrSetReset" style="margin-top:8px"></button></div>';
document.body.appendChild(setOv);
function setMenu() {
  setOv.querySelector('.bigword').textContent = nl() ? '🥽 VR-instellingen' : '🥽 VR settings';
  setOv.querySelector('#btnVrSetBack').textContent = nl() ? '← Terug' : '← Back';
  setOv.querySelector('#btnVrSetReset').textContent = nl() ? '↺ Alles terug naar standaard' : '↺ Reset to defaults';
  const box = setOv.querySelector('.vrOpts'); box.innerHTML = '';
  for (const [k, vals, lab] of OPTS) {
    const b = document.createElement('button'); b.className = 'btn small'; b.style.textAlign = 'left'; b.textContent = lab(S[k]);
    b.onclick = () => { S[k] = vals[(vals.indexOf(S[k]) + 1) % vals.length]; applySet(); saveSet(); setMenu(); };
    box.appendChild(b);
  }
  // the minimap has no setting of its own: it is the same switch as the M key on a keyboard
  const mapOnNow = () => { try { return localStorage.getItem('renas-rocket-rumble-minimap') !== 'off'; } catch (e) { return true; } };
  const mb = document.createElement('button'); mb.className = 'btn small'; mb.style.textAlign = 'left';
  mb.textContent = nl() ? `🗺 Minimap: ${mapOnNow() ? 'aan' : 'uit'}` : `🗺 Minimap: ${mapOnNow() ? 'on' : 'off'}`;
  mb.onclick = () => { const was = G.state; G.state = 'play'; tap('KeyM'); G.state = was; setMenu(); };
  box.appendChild(mb);
}
function applySet() {
  stars.visible = !!S.stars;
  placeHud();
}
setOv.querySelector('#btnVrSetBack').onclick = () => setOv.classList.remove('show');
setOv.querySelector('#btnVrSetReset').onclick = () => { Object.assign(S, DEF); applySet(); saveSet(); setMenu(); };
const openSet = () => { setMenu(); setOv.classList.add('show'); };
// the buttons that open it: in the pause menu (only in VR) and in ⚙️ Settings (only when this computer can do VR)
const pauseBtn = document.createElement('button'); pauseBtn.className = 'btn small'; pauseBtn.style.display = 'none'; pauseBtn.onclick = openSet;
$('btnResume').after(pauseBtn);
const setBtn = document.createElement('button'); setBtn.className = 'btn small'; setBtn.style.cssText = 'display:none;margin-top:12px'; setBtn.onclick = openSet;
if ($('btnTimer')) $('btnTimer').parentElement.after(setBtn);
function vrButtons() {
  pauseBtn.textContent = setBtn.textContent = nl() ? '🥽 VR-instellingen' : '🥽 VR settings';
  pauseBtn.style.display = G.vr ? '' : 'none';
}
setInterval(vrButtons, 500);   // keeps the labels in the current language

// ---------- the floating panels ----------
// They pop in (grow and fade) instead of just appearing, and drift up and down a tiny bit, like a hologram.
function panel(w, h, cw, ch, parent = rig) {
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthTest: false, depthWrite: false, fog: false, toneMapped: false }));
  m.renderOrder = 999; m.visible = false; m.frustumCulled = false; parent.add(m);
  return { m, cv, x: cv.getContext('2d'), tex, key: '', on: false, k: 0 };
}
const main = panel(1.5, 0.75, 1024, 512);
// where the big panel hangs: menus in the middle of your view (the game waits anyway), dialogue lower and
// smaller, so it never covers what is happening. Below your eyes a panel tilts back to face you.
const PLACE = { menu: [1.35, -1.6, -0.12, 1], talk: [1.0, -1.5, -0.34, 0.72] };
function placeMain(mode) { const [y, z, rx, s] = PLACE[mode]; main.baseY = y; main.sz = s; main.m.position.set(0, y, z); main.m.rotation.x = rx; }
placeMain('talk');
// a small strip low in front of you for the goal, prompts, toasts and banners
const info = panel(0.85, 0.3, 768, 270);
info.m.position.set(0, 0.72, -1.25); info.m.rotation.x = -0.55;
// the hearts, bolts and gears: a little screen on your left wrist, like a watch (until a left controller shows up, it floats low in front of you)
const hud = panel(0.2, 0.067, 600, 200);
const HUD_FLOAT = () => { rig.add(hud.m); hud.m.scale.setScalar(3.4); hud.m.position.set(0, 0.5, -1.05); hud.m.rotation.set(-0.9, 0, 0); };
HUD_FLOAT();
function animPanel(p, dt, t, baseY) {
  p.k += ((p.on ? 1 : 0) - p.k) * Math.min(1, dt * 10);
  p.m.visible = p.k > 0.02;
  p.m.material.opacity = p.k;
  if (baseY !== undefined) { p.m.scale.setScalar((p.sz || 1) * (0.88 + 0.12 * p.k)); p.m.position.y = baseY + Math.sin(t * 1.3) * 0.012; }
}
function drawInfo(lines) {
  const key = JSON.stringify(lines);
  if (key === info.key) return;
  info.key = key; info.on = lines.length > 0;
  if (!info.on) return;
  const x = info.x, W = info.cv.width, H = info.cv.height;
  bg(x, W, H);
  x.textBaseline = 'top'; x.textAlign = 'center';
  let y = 22;
  for (const [k, t] of lines.slice(0, 5)) {
    const big = k === 'banner' || k === 'title';
    x.font = big ? '800 38px system-ui,sans-serif' : '600 30px system-ui,sans-serif';
    x.fillStyle = big ? '#ffd23a' : k === 'prompt' ? '#7affc8' : k === 'quest' ? '#d9c8ff' : k === 'timer' ? '#8fd8ff' : '#fff8ec';
    for (const l of wrap(x, t, W - 60).slice(0, 2)) { if (y > H - 40) break; x.fillText(l, W / 2, y); y += big ? 44 : 36; }
  }
  info.tex.needsUpdate = true;
}

const shown = (el) => { if (!el || !el.getClientRects().length) return false; const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && +cs.opacity > 0.1; };
const txt = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
function wrap(x, s, maxW) {
  const out = []; let line = '';
  for (const word of s.split(' ')) {
    const tryL = line ? line + ' ' + word : word;
    if (x.measureText(tryL).width > maxW && line) { out.push(line); line = word; } else line = tryL;
  }
  if (line) out.push(line);
  return out;
}
// the dark card for prompts, toasts and goals
function bg(x, W, H) {
  x.clearRect(0, 0, W, H);
  x.fillStyle = 'rgba(20,16,40,.86)'; x.strokeStyle = 'rgba(255,248,236,.5)'; x.lineWidth = 6;
  x.beginPath(); x.roundRect(4, 4, W - 8, H - 8, 34); x.fill(); x.stroke();
}
// a menu: a station hologram, deep blue glass with a glowing cyan edge and scan lines
function holo(x, W, H) {
  x.clearRect(0, 0, W, H);
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(14,40,74,.9)'); g.addColorStop(1, 'rgba(8,18,44,.9)');
  x.fillStyle = g; x.beginPath(); x.roundRect(14, 14, W - 28, H - 28, 30); x.fill();
  x.fillStyle = 'rgba(94,242,224,.05)'; for (let y = 18; y < H - 18; y += 6) x.fillRect(18, y, W - 36, 2);
  x.save(); x.shadowColor = '#5ef2e0'; x.shadowBlur = 22; x.strokeStyle = '#5ef2e0'; x.lineWidth = 5;
  x.beginPath(); x.roundRect(14, 14, W - 28, H - 28, 30); x.stroke(); x.restore();
  x.fillStyle = '#5ef2e0'; for (const [cx, cy] of [[30, 30], [W - 30, 30], [30, H - 30], [W - 30, H - 30]]) { x.beginPath(); x.arc(cx, cy, 6, 0, 6.3); x.fill(); }
}
// a line of dialogue: a cream speech bubble with the speaker's name on a tag in their own colour, like in Otis in Orbit
function bubble(x, W, H, bodyH, col) {
  x.clearRect(0, 0, W, H);
  x.fillStyle = 'rgba(0,0,0,.25)'; x.beginPath(); x.roundRect(22, 52, W - 40, bodyH, 40); x.fill();   // soft shadow
  x.fillStyle = '#fff8ec'; x.strokeStyle = '#2b2440'; x.lineWidth = 7;
  x.beginPath(); x.roundRect(14, 44, W - 32, bodyH, 40); x.fill(); x.stroke();
  // the tail, pointing down-left toward the speaker
  x.beginPath(); x.moveTo(110, 44 + bodyH - 4); x.lineTo(84, 44 + bodyH + 46); x.lineTo(170, 44 + bodyH - 4); x.closePath(); x.fill(); x.stroke();
  x.fillStyle = '#fff8ec'; x.fillRect(104, 44 + bodyH - 12, 72, 10);
  void col;
}
// what the panel should show right now: a menu, or the dialogue + prompts
function overlayNow() {
  const list = [...document.querySelectorAll('.overlay.show, #simonPad')].filter(shown);
  return list[list.length - 1] || null;
}
const isRange = (b) => b.tagName === 'INPUT' && b.type === 'range';
function itemText(b) {
  if (isRange(b)) { const lab = txt(b.previousElementSibling) || b.id, v = (+b.value - +b.min) / ((+b.max - +b.min) || 1); return `◀ ${lab}: ${Math.round(v * 100)}% ▶`; }
  const t = txt(b); if (t.length <= 1 && b.getAttribute('aria-label')) return t === '‹' ? '‹ ' + (nl() ? 'vorige' : 'previous') : (nl() ? 'volgende' : 'next') + ' ›';
  return t;
}
function buttonsOf(ov) { return [...ov.querySelectorAll('button, input[type=range]')].filter((b) => shown(b) && itemText(b)); }
let menuSel = 0, menuOv = null;
function drawMain() {
  const P_ = main, x = P_.x, W = P_.cv.width, H = P_.cv.height;
  const ov = overlayNow();
  let content;
  if (ov) {
    const bs = buttonsOf(ov);
    if (ov !== menuOv) { menuOv = ov; menuSel = Math.max(0, bs.findIndex((b) => !b.disabled)); }
    menuSel = Math.min(menuSel, bs.length - 1);
    const title = [...ov.querySelectorAll('.bigword, h3, #galSys, #galName, #galInfo')].filter(shown).map(txt).filter(Boolean).slice(0, 3);
    content = { menu: true, title, items: bs.map((b) => [itemText(b).slice(0, 52), !!b.disabled]), sel: menuSel };
  } else {
    const d = $('dText'), sub = d && d.querySelector('small'), dlg = shown($('dialog')), rad = !dlg && shown($('radio'));
    const said = d ? [...d.childNodes].filter((n) => n !== sub).map((n) => n.textContent).join('').trim() : '';
    content = {
      who: dlg ? txt($('dWho')) : rad ? txt($('radioWho')) : '',
      col: dlg ? $('dWho').style.background || '#2b2440' : '#2b2440',
      say: dlg ? said : rad ? txt($('radioTxt')) : '',
      radio: rad,
      sub: dlg && sub ? txt(sub) : '',
      lines: [['title', $('title')], ['banner', $('banner')], ['toast', $('toast')], ['prompt', $('prompt')], ...(G.state === 'play' && !G.cutscene ? [['goal', $('goal')], ['quest', $('quest')], ['timer', $('speedrun')]] : [])]
        .filter(([, el]) => el && shown(el) && txt(el)).map(([k, el]) => [k, txt(el)]),
    };
    // the goal, toasts and banners go on the small strip; the big panel only shows a line of dialogue or a radio call
    // (with its prompt), and stays away the rest of the time
    drawInfo(content.lines.filter(([k]) => !content.say || !['goal', 'prompt', 'quest', 'timer'].includes(k)));
    content.lines = content.say ? content.lines.filter(([k]) => k === 'prompt') : [];
  }
  if (ov) drawInfo([]);
  const key = JSON.stringify(content);
  if (key === P_.key) return;
  P_.key = key;
  const empty = !content.menu && !content.say;
  P_.on = !empty;
  if (empty) return;
  placeMain(content.menu ? 'menu' : 'talk');
  x.textBaseline = 'top'; x.textAlign = 'left';
  let y = 44;
  if (content.menu) {
    holo(x, W, H);
    x.save(); x.shadowColor = '#5ef2e0'; x.shadowBlur = 14; x.fillStyle = '#c8fff6'; x.font = '800 38px system-ui,sans-serif';
    for (const t of content.title) { for (const l of wrap(x, t, W - 100).slice(0, 2)) { x.fillText(l, 50, y); y += 44; } x.font = '600 28px system-ui,sans-serif'; x.fillStyle = '#8fd8ff'; }
    x.restore();
    y += 8;
    const rows = Math.max(1, Math.floor((H - y - 66) / 40)), from = Math.max(0, Math.min(content.sel - Math.floor(rows / 2), content.items.length - rows));
    x.font = '700 30px system-ui,sans-serif';
    content.items.slice(from, from + rows).forEach(([t, off], k) => {
      const i = from + k, on = i === content.sel;
      if (on) { x.save(); x.shadowColor = '#ffd23a'; x.shadowBlur = 18; x.fillStyle = '#ffd23a'; x.beginPath(); x.roundRect(36, y - 4, W - 72, 38, 12); x.fill(); x.restore(); }
      x.fillStyle = on ? '#1a1030' : off ? 'rgba(200,230,255,.3)' : '#e8f6ff';
      x.fillText((on ? '▶ ' : '   ') + t, 50, y); y += 40;
    });
    x.font = '600 22px system-ui,sans-serif'; x.fillStyle = 'rgba(143,216,255,.7)';
    x.fillText(nl() ? '🕹 stick = kiezen · trigger / A = OK · B = terug' : '🕹 stick = choose · trigger / A = OK · B = back', 50, H - 56);
  } else if (content.say && !content.radio) {
    // measure first, so the bubble is as tall as the text
    x.font = '600 34px system-ui,sans-serif'; const L1 = wrap(x, content.say, W - 120).slice(0, 5);
    x.font = 'italic 500 26px system-ui,sans-serif'; const L2 = content.sub ? wrap(x, content.sub, W - 120).slice(0, 3) : [];
    const extra = content.lines.filter(([k]) => k === 'prompt').slice(0, 1);
    const bodyH = Math.min(H - 110, 46 + L1.length * 42 + (L2.length ? 10 + L2.length * 32 : 0) + 30);
    bubble(x, W, H, bodyH, content.col);
    // the name tag
    x.font = '800 30px system-ui,sans-serif';
    const tw = x.measureText(content.who).width + 44;
    x.fillStyle = content.col; x.strokeStyle = '#2b2440'; x.lineWidth = 6;
    x.beginPath(); x.roundRect(44, 14, tw, 52, 18); x.fill(); x.stroke();
    x.fillStyle = '#fff8ec'; x.fillText(content.who, 66, 26);
    y = 84;
    x.font = '600 34px system-ui,sans-serif'; x.fillStyle = '#2b2440';
    for (const l of L1) { x.fillText(l, 56, y); y += 42; }
    if (L2.length) { y += 10; x.font = 'italic 500 26px system-ui,sans-serif'; x.fillStyle = '#6a5a9a'; for (const l of L2) { x.fillText(l, 56, y); y += 32; } }
    x.font = '800 22px system-ui,sans-serif'; x.fillStyle = 'rgba(43,36,64,.5)'; x.textAlign = 'right';
    x.fillText(nl() ? 'trigger / A ▸' : 'trigger / A ▸', W - 50, 44 + bodyH - 36);
    x.textAlign = 'left';
    if (extra.length) { x.font = '600 24px system-ui,sans-serif'; x.fillStyle = '#7affc8'; x.fillText(extra[0][1], 200, 44 + bodyH + 14); }
  } else {
    bg(x, W, H);
    y = 34;
    if (content.say) {   // radio calls: a small "📻" card
      x.font = '800 30px system-ui,sans-serif'; x.fillStyle = '#ffd23a'; x.fillText('📻 ' + content.who, 40, y); y += 42;
      x.font = '600 30px system-ui,sans-serif'; x.fillStyle = '#fff8ec';
      for (const l of wrap(x, content.say, W - 80).slice(0, 4)) { x.fillText(l, 40, y); y += 38; }
      y += 12;
    }
    for (const [k, t] of content.lines) {
      x.font = k === 'banner' || k === 'title' ? '800 36px system-ui,sans-serif' : '600 26px system-ui,sans-serif';
      x.fillStyle = k === 'banner' || k === 'title' ? '#ffd23a' : k === 'prompt' ? '#7affc8' : '#fff8ec';
      for (const l of wrap(x, t, W - 80).slice(0, 2)) { if (y > H - 44) break; x.fillText(l, 40, y); y += k === 'banner' || k === 'title' ? 42 : 32; }
    }
  }
  P_.tex.needsUpdate = true;
}
function drawHud() {
  hud.on = (G.state === 'play' || G.state === 'over') && !G.cutscene && !overlayNow();
  if (!hud.on) return;
  const pips = $('bossPips') ? [...$('bossPips').children] : [], left = pips.filter((p) => !p.classList.contains('off')).length;
  const boss = shown($('boss')) ? `${txt($('bossName'))} ${'●'.repeat(left)}${'○'.repeat(pips.length - left)}` : '';
  const key = `${P.hp}/${P.maxHp}/${G.coins}/${txt($('rareN'))}/${boss}`;
  if (key === hud.key) return;
  hud.key = key;
  const x = hud.x, W = hud.cv.width, H = hud.cv.height;
  // a watch face: dark glass, cyan rim
  x.clearRect(0, 0, W, H);
  x.fillStyle = 'rgba(12,20,44,.92)'; x.beginPath(); x.roundRect(8, 8, W - 16, H - 16, 40); x.fill();
  x.save(); x.shadowColor = '#5ef2e0'; x.shadowBlur = 16; x.strokeStyle = '#5ef2e0'; x.lineWidth = 6; x.beginPath(); x.roundRect(8, 8, W - 16, H - 16, 40); x.stroke(); x.restore();
  x.textBaseline = 'middle'; x.textAlign = 'center';
  x.font = '800 56px system-ui,sans-serif'; x.fillStyle = '#ff5a6e';
  x.fillText('❤'.repeat(Math.max(0, P.hp)) + '♡'.repeat(Math.max(0, P.maxHp - P.hp)), W / 2, boss ? 62 : 72);
  x.font = '800 40px system-ui,sans-serif'; x.fillStyle = '#fff8ec';
  x.fillText(`🔩 ${G.coins || 0}    ⚙ ${txt($('rareN'))}`, W / 2, boss ? 122 : 140);
  if (boss) { x.font = '800 30px system-ui,sans-serif'; x.fillStyle = '#ffd23a'; x.fillText('👾 ' + boss, W / 2, 168); }
  hud.tex.needsUpdate = true;
}

// ---------- the screen effects ----------
// On a screen, getting hurt, fading to black, the film bars, Koning Boe's darkness, Kraak's ink and Zweefrijk's
// purple edge are HTML laid over the game. A headset doesn't show the page, so they are painted onto a sheet
// right in front of your eyes (and a black ball round your head for the fades), following the same HTML.
const fx = new THREE.Group(); fx.matrixAutoUpdate = false;
const fxCv = document.createElement('canvas'); fxCv.width = fxCv.height = 512;
const fxTex = new THREE.CanvasTexture(fxCv); fxTex.colorSpace = THREE.SRGBColorSpace;
const fxSheet = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map: fxTex, transparent: true, depthTest: false, depthWrite: false, fog: false, toneMapped: false }));
fxSheet.position.z = -0.3; fxSheet.renderOrder = 1001; fxSheet.frustumCulled = false; fx.add(fxSheet);
const fadeBall = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), new THREE.MeshBasicMaterial({ color: 0x14121f, side: THREE.BackSide, transparent: true, opacity: 0, depthTest: false, depthWrite: false, fog: false }));
fadeBall.renderOrder = 1002; fadeBall.frustumCulled = false; fx.add(fadeBall);
let fxKey = '', barsK = 0, comfortK = 0, fadeK = 0, darkK = 0, hurtK = 0, lastHp = null, flashK = 0, flashCol = '#ffffff';
const seenFlash = new WeakSet();
const op = (el) => (el ? +getComputedStyle(el).opacity || 0 : 0);
const ease = (cur, to, dt, rate) => cur + (to - cur) * Math.min(1, dt * rate);
function edgeGlow(x, S, col, a, inner) {
  const g = x.createRadialGradient(S / 2, S / 2, S * inner, S / 2, S / 2, S * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, col);
  x.globalAlpha = a; x.fillStyle = g; x.fillRect(0, 0, S, S); x.globalAlpha = 1;
}
function drawFx(dt) {
  barsK += ((document.body.classList.contains('cutscene') ? 1 : 0) - barsK) * Math.min(1, dt * 6);
  // (CSS transitions are off in VR, so the page jumps straight to where it is going: the fades are smoothed here)
  fadeK = ease(fadeK, op($('fade')), dt, 7);
  darkK = ease(darkK, Math.max(0, ...[...document.querySelectorAll('.darkFx')].map(op)), dt, 3);
  if (lastHp !== null && P.hp < lastHp) hurtK = 1;   // got hit: a red flash round the edges (on a screen that is a CSS animation)
  lastHp = P.hp; hurtK = Math.max(0, hurtK - dt / 0.55);
  for (const e of document.querySelectorAll('.vrFlash')) if (!seenFlash.has(e)) { seenFlash.add(e); flashK = 0.7; flashCol = e.dataset.vr || '#ffffff'; }
  flashK = Math.max(0, flashK - dt / 0.45 * 0.7);
  const low = $('hurt') && $('hurt').classList.contains('low') ? 0.18 + 0.37 * (0.5 + 0.5 * Math.sin((G.t || 0) * 5.7)) : 0;   // last heart: a slow red pulse
  const hurt = Math.max(hurtK, low), dark = darkK, tints = [...document.querySelectorAll('.vrTint')].map((e) => [e.dataset.vr || '#b07aff', op(e)]).filter(([, a]) => a > 0.02);
  const inks = [...document.querySelectorAll('.inkFx i')].map((e) => { const r = e.getBoundingClientRect(); return [(r.left + r.width / 2) / innerWidth, (r.top + r.height / 2) / innerHeight, r.width / innerWidth]; }).filter((v) => v[2] > 0.005);
  fadeBall.material.opacity = fadeK;
  fadeBall.visible = fadeK > 0.01;
  const flashes = flashK > 0.02 ? [[flashCol, flashK]] : [];
  const key = [hurt, dark, barsK, Math.round(comfortK * 20) / 20, ...tints.flat(), ...inks.flat(), ...flashes.flat()].map((v) => (typeof v === 'number' ? v.toFixed(2) : v)).join(',');
  if (key === fxKey) return;
  fxKey = key;
  const x = fxCv.getContext('2d'), S = 512;
  x.clearRect(0, 0, S, S);
  if (barsK > 0.01) {   // the film bars, softer than on a screen (hard black bars in VR feel like a box round your head)
    for (const [y0, y1] of [[0, 0.2], [1, 0.8]]) { const g = x.createLinearGradient(0, S * y0, 0, S * y1); g.addColorStop(0, `rgba(20,18,31,${0.85 * barsK})`); g.addColorStop(1, 'rgba(20,18,31,0)'); x.fillStyle = g; x.fillRect(0, Math.min(y0, y1) * S, S, 0.2 * S); }
  }
  if (comfortK > 0.03) { const g = x.createRadialGradient(256, 256, 512 * (0.34 - comfortK * 0.12), 256, 256, 512 * 0.62); g.addColorStop(0, 'rgba(6,4,14,0)'); g.addColorStop(1, `rgba(6,4,14,${Math.min(1, comfortK * 1.2)})`); x.fillStyle = g; x.fillRect(0, 0, 512, 512); }
  for (const [col, a] of tints) edgeGlow(x, S, col, a * 0.55, 0.32);
  if (dark > 0.01) {   // Koning Boe: everything dark except a little circle in the middle
    const g = x.createRadialGradient(S / 2, S * 0.56, S * 0.06, S / 2, S * 0.56, S * 0.36);
    g.addColorStop(0, 'rgba(8,0,18,0)'); g.addColorStop(0.45, 'rgba(8,0,18,.7)'); g.addColorStop(1, 'rgba(5,0,12,.97)');
    x.globalAlpha = dark; x.fillStyle = g; x.fillRect(0, 0, S, S); x.globalAlpha = 1;
  }
  for (const [cx, cy, w] of inks) {   // Kraak's ink splats, where they are on the screen
    const r = w * S * 0.5, px = S * 0.15 + cx * S * 0.7, py = S * 0.15 + cy * S * 0.7;
    const g = x.createRadialGradient(px - r * 0.2, py - r * 0.25, 0, px, py, r);
    g.addColorStop(0, '#4a3a6a'); g.addColorStop(0.75, '#1a1030'); g.addColorStop(1, 'rgba(26,16,48,0)');
    x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, 6.3); x.fill();
  }
  if (hurt > 0.01) edgeGlow(x, S, 'rgba(230,40,70,.9)', hurt * 0.8, 0.3);
  for (const [col, a] of flashes) { x.globalAlpha = a * 0.8; x.fillStyle = col; x.fillRect(0, 0, S, S); x.globalAlpha = 1; }   // a boss going down: the whole view flashes
  fxTex.needsUpdate = true;
}
// hang the effects in front of your eyes: the headset's own head pose for this frame (so they never lag behind)
const _hp = new THREE.Vector3(), _hq = new THREE.Quaternion(), _hs = new THREE.Vector3();
function placeFx() {
  try { if (renderer.xr.updateCamera) renderer.xr.updateCamera(camera); } catch (e) { /* older three.js: the camera's own pose is close enough */ }
  const xc = renderer.xr.getCamera();
  (xc && xc.matrixWorld ? xc.matrixWorld : camera.matrixWorld).decompose(_hp, _hq, _hs);
  fx.matrix.compose(_hp, _hq, _hs.set(1, 1, 1));
  fx.matrixWorldNeedsUpdate = true;
  stars.position.copy(_hp);
}

// ---------- the sky ----------
// On a screen the sky is the page's CSS background behind a see-through canvas. A headset doesn't show the page,
// so the same colours are painted onto a sky dome, with a real starry sky in front of it: thousands of stars,
// some of them twinkling, and big soft clouds of nebula in the colours of the planet's sky.
const skyCv = document.createElement('canvas'); skyCv.width = 256; skyCv.height = 256;
const skyTex = new THREE.CanvasTexture(skyCv); skyTex.mapping = THREE.EquirectangularReflectionMapping; skyTex.colorSpace = THREE.SRGBColorSpace;
let skyKey = '';
const stars = new THREE.Group();
function starLayer(n, size, seed) {
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), c = new THREE.Color();
  let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n; i++) {
    const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, r = Math.sqrt(1 - u * u), R = 950;
    pos.set([Math.cos(a) * r * R, u * R, Math.sin(a) * r * R], i * 3);
    const k = rnd(); c.set(k < 0.15 ? 0xa8c8ff : k < 0.25 ? 0xffe0a8 : k < 0.3 ? 0xffb0c8 : 0xffffff);
    col.set([c.r, c.g, c.b], i * 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ size, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false, fog: false }));
  p.frustumCulled = false; p.renderOrder = -10; stars.add(p);
  return p;
}
const starsS = starLayer(2600, 2.2, 7), starsM = starLayer(500, 3.4, 99), starsB = starLayer(70, 5.5, 1234);
const glowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(0.35, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
})();
const nebulas = [[0.6, 0.35, -0.7, 620], [-0.8, 0.1, 0.4, 520], [0.1, -0.6, 0.75, 700], [-0.3, 0.85, -0.2, 480], [0.85, -0.2, 0.45, 560]].map(([a, b, c, s]) => {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: 0.22, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  sp.position.set(a, b, c).normalize().multiplyScalar(900); sp.scale.set(s, s * 0.6, 1); sp.renderOrder = -11; stars.add(sp);
  return sp;
});
function drawSky() {
  const css = document.body.style.background || getComputedStyle(document.body).backgroundImage || '';
  if (css === skyKey) return;
  skyKey = css;
  const cols = css.match(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/gi) || ['#1a1440', '#06020e'];
  const a = cols[0], b = cols[Math.floor(cols.length / 2)] || a, c = cols[cols.length - 1];
  const x = skyCv.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, c); g.addColorStop(0.3, b); g.addColorStop(0.5, a); g.addColorStop(0.7, b); g.addColorStop(1, c);
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  skyTex.needsUpdate = true;
  scene.background = skyTex;
  // the nebulas take the sky's colours, made a bit brighter so they glow
  const tc = new THREE.Color();
  nebulas.forEach((n, i) => { try { tc.setStyle([a, b, c][i % 3]); } catch (e) { tc.set(0x7a5aff); } n.material.color.copy(tc).lerp(new THREE.Color(0xffffff), 0.15).multiplyScalar(1.6); });
}
function twinkle(t) {
  starsB.material.opacity = 0.65 + Math.sin(t * 2.1) * 0.35;
  starsM.material.opacity = 0.75 + Math.sin(t * 1.3 + 1) * 0.25;
}

// ---------- your hands: Rênas's space gloves ----------
// White gloves with a light-blue cuff and an orange band, like his suit. They sit on the controllers (or on your
// tracked hands), and the left one wears the watch with your hearts.
function glove(side) {
  const g = new THREE.Group(), white = toon(0xf4f1ea), suit = toon(0x7ac8ff), orange = toon(0xff7a3d);
  const palm = mk(new THREE.SphereGeometry(0.042, 14, 10), white, 0, -0.005, 0.01, g, 1.08); palm.scale.set(1, 0.72, 1.15);
  for (let i = 0; i < 4; i++) {
    const f = mk(new THREE.CapsuleGeometry(0.011, 0.034, 4, 8), white, (-0.022 + i * 0.015), -0.012, -0.045 - (i === 1 || i === 2 ? 0.005 : 0), g, 1.1);
    f.rotation.x = Math.PI / 2 + 0.5;
  }
  const th = mk(new THREE.CapsuleGeometry(0.012, 0.03, 4, 8), white, 0.038 * side, 0.004, -0.012, g, 1.1); th.rotation.set(Math.PI / 2, 0, 0.7 * side);
  const cuff = mk(new THREE.CylinderGeometry(0.036, 0.04, 0.05, 16), suit, 0, 0, 0.062, g, 1.06); cuff.rotation.x = Math.PI / 2;
  const band = mk(new THREE.CylinderGeometry(0.041, 0.041, 0.012, 16), orange, 0, 0, 0.046, g, 0); band.rotation.x = Math.PI / 2;
  return g;
}
// the watch goes on your off hand: the left wrist, or the right one when you play left-handed
let wristGrip = { left: null, right: null };
function placeHud() {
  const g = wristGrip[S.lefty ? 'right' : 'left'];
  if (S.hud === 'wrist' && g) { g.add(hud.m); hud.m.scale.setScalar(1); hud.m.position.set(0, 0.045, 0.075); hud.m.rotation.set(-Math.PI / 2 + 0.75, 0, 0); }
  else HUD_FLOAT();
}
const grips = [0, 1].map((i) => {
  const gr = renderer.xr.getControllerGrip(i);
  gr.addEventListener('connected', (e) => {
    const hand = e.data && e.data.handedness === 'left' ? 'left' : 'right';
    if (gr.userData.glove) gr.remove(gr.userData.glove);
    gr.userData.glove = glove(hand === 'left' ? -1 : 1); gr.add(gr.userData.glove);
    gr.userData.hand = hand; wristGrip[hand] = gr; placeHud();
  });
  gr.addEventListener('disconnected', () => {
    if (gr.userData.glove) { gr.remove(gr.userData.glove); gr.userData.glove = null; }
    if (gr.userData.hand) wristGrip[gr.userData.hand] = null;
    placeHud();
  });
  rig.add(gr);
  return gr;
});
void grips;

// ---------- the minimap, next to the watch ----------
// The same round map as on a screen (same canvas, same M key to switch it off), shown beside the watch.
const mapCv = $('minimap');
const mapTex = mapCv ? new THREE.CanvasTexture(mapCv) : null;
if (mapTex) mapTex.colorSpace = THREE.SRGBColorSpace;
const mapM = new THREE.Mesh(new THREE.CircleGeometry(0.05, 40), new THREE.MeshBasicMaterial({ map: mapTex, transparent: true, depthTest: false, depthWrite: false, fog: false, toneMapped: false }));
mapM.position.set(0.16, 0, 0.002); mapM.renderOrder = 1000; mapM.frustumCulled = false; mapM.visible = false;
hud.m.add(mapM);
let mapT = 0;
function updateMap(dt) {
  const on = !!mapCv && mapCv.style.display === 'block' && hud.m.visible;
  mapM.visible = on;
  if (!on) return;
  mapM.material.opacity = hud.m.material.opacity;
  mapT -= dt; if (mapT <= 0) { mapT = 1 / 15; mapTex.needsUpdate = true; }
}

// ---------- the locals' speech bubbles ----------
// On a screen they are HTML stuck over each local's head. In VR they are little cream bubbles in the world itself,
// floating over the same heads, always turned toward you, with the same lines at the same moments.
const bubG = new THREE.Group();
const bubs = new Map();   // bubble (from the world) -> its VR sprite
function bubSprite(text) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 160;
  const x = cv.getContext('2d');
  x.font = '700 38px system-ui,sans-serif';
  const lines = wrap(x, text, 440).slice(0, 2), w = Math.min(500, Math.max(...lines.map((l) => x.measureText(l).width)) + 50), h = 30 + lines.length * 46;
  const L = (512 - w) / 2;
  x.fillStyle = '#fff8ec'; x.strokeStyle = '#2b2440'; x.lineWidth = 6;
  x.beginPath(); x.roundRect(L, 6, w, h, 26); x.fill(); x.stroke();
  x.beginPath(); x.moveTo(246, 6 + h - 3); x.lineTo(256, 6 + h + 18); x.lineTo(268, 6 + h - 3); x.closePath(); x.fill(); x.stroke();
  x.fillRect(244, 6 + h - 8, 26, 6);
  x.fillStyle = '#2b2440'; x.textAlign = 'center'; x.textBaseline = 'top';
  lines.forEach((l, i) => x.fillText(l, 256, 22 + i * 46));
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, toneMapped: false }));
  sp.scale.set(1.6, 0.5, 1); sp.center.set(0.5, 0);
  return sp;
}
function updateBubbles() {
  const w = G.world, list = (w && w.bubbles) || [], live = new Set();
  for (const b of list) {
    const text = b.el && b.el.textContent;
    const on = b.shown && text && b.el.style.opacity !== '0' && !G.cutscene;
    if (!on) continue;
    live.add(b);
    let s = bubs.get(b);
    if (!s || s.text !== text) { if (s) { bubG.remove(s.sp); s.sp.material.map.dispose(); s.sp.material.dispose(); } s = { text, sp: bubSprite(text) }; bubs.set(b, s); bubG.add(s.sp); }
    s.sp.position.copy(b.npc.g.position).addScaledVector(b.npc.dir, b.y);
  }
  for (const [b, s] of bubs) if (!live.has(b)) { bubG.remove(s.sp); s.sp.material.map.dispose(); s.sp.material.dispose(); bubs.delete(b); }
}

// ---------- controllers ----------
const held = new Set(), prev = {};
function vk(code, on) {
  if (on) { if (!held.has(code)) { held.add(code); keys.add(code); pressed.add(code); } }
  else if (held.has(code)) { held.delete(code); keys.delete(code); }
}
function releaseAll() { for (const c of [...held]) vk(c, false); }
const tap = (code) => { dispatchEvent(new KeyboardEvent('keydown', { code })); dispatchEvent(new KeyboardEvent('keyup', { code })); };
const edge = (name, on) => { const was = !!prev[name]; prev[name] = on; return on && !was; };
function buzz(src, k = 0.3) { try { const h = src && src.gamepad && src.gamepad.hapticActuators && src.gamepad.hapticActuators[0]; if (h) h.pulse(k, 40); } catch (e) { /* no rumble */ } }
let uiT = 0;
export function pollVR(dt) {
  if (!G.vr || !session) return;
  flushRAF();   // the page's own requestAnimationFrame callbacks, run from the headset's frames
  // read both hands
  const H = { left: null, right: null };
  for (const src of session.inputSources) if (src.handedness in H) H[S.lefty ? (src.handedness === 'left' ? 'right' : 'left') : src.handedness] = src;   // left-handed: the hands swap jobs
  const pad = (h) => (H[h] && H[h].gamepad) || null;
  const btn = (h, i) => { const g = pad(h); return !!(g && g.buttons[i] && g.buttons[i].pressed); };
  const stick = (h) => { const g = pad(h); if (!g) return [0, 0]; const a = g.axes, o = a.length >= 4 ? 2 : 0; return [a[o] || 0, a[o + 1] || 0]; };
  const [lx, ly] = stick('left'), [rx, ry] = stick('right');
  const trigR = S.lefty ? sel.left : sel.right, trigL = S.lefty ? sel.right : sel.left;
  const gripR = (S.lefty ? sqz.left : sqz.right) || btn('right', 1), gripL = (S.lefty ? sqz.right : sqz.left) || btn('left', 1);
  const A = btn('right', 4), B = btn('right', 5), X = btn('left', 4), Y = btn('left', 5);

  // panels: redrawn ten times a second at most
  uiT -= dt; if (uiT <= 0) { uiT = 0.1; drawMain(); drawHud(); drawSky(); updateBubbles(); }
  updateMap(dt);
  drawFx(dt); twinkle(G.t || 0);
  animPanel(main, dt, G.t || 0, main.baseY); animPanel(info, dt, G.t || 0); animPanel(hud, dt, G.t || 0);

  // ----- menus -----
  const ov = overlayNow();
  if (ov) {
    releaseAll(); comfortK = 0; G.vrMove = null;
    const bs = buttonsOf(ov);
    const sy = Math.abs(ly) > Math.abs(ry) ? ly : ry;
    const down = edge('mDown', sy > 0.6), up = edge('mUp', sy < -0.6);
    if (sy > -0.3 && sy < 0.3) { prev.mDown = prev.mUp = false; }
    if ((down || up) && bs.length) { menuSel = (menuSel + (down ? 1 : -1) + bs.length) % bs.length; buzz(H.right || H.left, 0.2); main.key = ''; uiT = 0; }
    // stick left/right: move a slider (music, sound, mouse speed), or flip through the planets in the planet picker
    const sx = Math.abs(lx) > Math.abs(rx) ? lx : rx;
    const goR = edge('mRight', sx > 0.6), goL = edge('mLeft', sx < -0.6);
    if (sx > -0.3 && sx < 0.3) { prev.mRight = prev.mLeft = false; }
    if (goR || goL) {
      const it = bs[menuSel];
      if (it && isRange(it)) {
        const st = +it.step || 0.05;
        it.value = Math.min(+it.max, Math.max(+it.min, +it.value + (goR ? st * 2 : -st * 2)));
        it.dispatchEvent(new Event('input', { bubbles: true })); it.dispatchEvent(new Event('change', { bubbles: true }));
        buzz(H.right || H.left, 0.15); main.key = ''; uiT = 0;
      } else {
        const arrow = ov.querySelector(goR ? '#galNext' : '#galPrev');
        if (arrow && shown(arrow)) { arrow.click(); buzz(H.right || H.left, 0.2); main.key = ''; uiT = 0; }
      }
    }
    if (edge('mOk', trigR || trigL || A) && bs[menuSel] && !bs[menuSel].disabled && !isRange(bs[menuSel])) { buzz(H.right, 0.5); bs[menuSel].click(); menuOv = null; main.key = ''; uiT = 0; }
    if (edge('mBack', B || Y)) {
      const back = bs.find((b) => /Close|Back|Resume|Skip/.test(b.id) || /^←/.test(txt(b)));
      if (back) { back.click(); menuOv = null; main.key = ''; uiT = 0; } else if ($('pause').classList.contains('show')) tap('KeyP');
    }
    edge('Y', Y);
    return;
  }
  prev.mOk = trigR || trigL || A; prev.mBack = B || Y;

  // ----- playing -----
  G.shake = 0;                                  // a shaking camera feels awful in a headset
  if (G.state === 'play') cam.lastIn = G.t;     // and the camera doesn't swing behind Rênas by itself: you turn with the stick
  cam.pitch = Math.min(cam.pitch, 0.6);
  const dz = 0.35;
  // the left stick walks where your HEAD looks: look straight ahead and push forward, and Rênas walks that way
  // (smoothly in every direction, and how far you push is how fast he walks)
  const sl = Math.hypot(lx, ly);
  if (sl > 0.15 && P.up) {
    const xc = renderer.xr.getCamera();
    vmF.set(0, 0, -1).transformDirection(xc.matrixWorld).addScaledVector(P.up, -vmF.dot(P.up));
    if (vmF.lengthSq() < 0.02) vmF.copy(cam.fwd).addScaledVector(P.up, -cam.fwd.dot(P.up));   // looking straight down: use the camera's heading
    vmF.normalize(); vmR.crossVectors(vmF, P.up).normalize();
    const k = Math.min(1, (sl - 0.15) / 0.85) / sl;
    G.vrMove = { fwd: vmF, right: vmR, x: lx * k, y: -ly * k };
  } else G.vrMove = null;
  vk('ShiftLeft', Math.hypot(lx, ly) > 0.92 || btn('left', 3));
  vk('Space', trigR || A);
  vk('KeyF', gripR);
  vk('KeyX', trigL);
  vk('KeyC', gripL);
  vk('KeyE', B || X);
  // turning: in steps (the camera jumps round Rênas in one go: gliding is what makes most people seasick), or smooth if you like that
  const canTurn = G.state === 'play' && !G.cutscene && P.up;
  const spin = (a) => { cam.fwd.applyAxisAngle(P.up, a); cam.pos.sub(P.pos).applyAxisAngle(P.up, a).add(P.pos); };
  let turning = 0;
  if (S.turn) {
    const turnR = edge('tR', rx > 0.7), turnL = edge('tL', rx < -0.7);
    if (rx > -0.3 && rx < 0.3) prev.tR = prev.tL = false;
    if ((turnR || turnL) && canTurn) { spin((turnR ? -1 : 1) * S.turn * Math.PI / 180); buzz(H.right, 0.15); }
  } else if (canTurn && Math.abs(rx) > 0.2) { spin(-Math.sign(rx) * (Math.abs(rx) - 0.2) / 0.8 * 2.2 * dt); turning = Math.abs(rx); }
  // the comfort vignette: the edges of your view go dark while you move fast, fall or turn smoothly,
  // so your eyes don't fight with your sense of balance
  const move = P.vt ? Math.min(1, P.vt.length() / 9 + Math.abs(P.vr || 0) / 14 + turning * 0.8) : 0;
  comfortK += ((G.state === 'play' && !G.cutscene ? move * [0, 0.55, 0.9][S.comfort] : 0) - comfortK) * Math.min(1, dt * 5);
  if (edge('Y', Y)) tap(G.cutscene ? 'Escape' : 'KeyP');
}
