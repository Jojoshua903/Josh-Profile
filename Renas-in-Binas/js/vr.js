import { THREE, G, renderer, scene, camera, anyPerp, $, toast, toon, mk } from './core.js?v=20261114d';
import { initAudio } from './audio.js?v=20261114d';
import { tr, LANG } from './lang.js?v=20261114d';
import { P, keys, pressed, cam, model } from './player.js?v=20261114d';

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
//   click the right stick: switch between 3rd person (watch Rênas) and 1st person (look through his helmet)
//   🥽 VR settings (in the pause menu): view, turning, comfort vignette, distance, seated, watch, left-handed, stars, silhouette
//   menus: either stick up/down = choose · trigger or A = OK · B = back
// With hand tracking a pinch is the same as the trigger.

const EYE = 1.5;           // the headset adds your real eye height (about 1.5 m) on top of the rig
// 1st person: you stand inside Rênas. He is a kid, so the rig is shrunk: your real eye height (about 1.5 m)
// then lands at the height of his eyes, and the world around you looks as big as it does to him.
const FP_SCALE = 0.68;
// ---------- VR settings (saved in this browser, apart from the saves) ----------
const SET_KEY = 'renas-rocket-rumble-vr';
const DEF = { view: '3rd', turn: 30, comfort: 1, seated: false, dist: 1, sil: true, stars: true, hud: 'wrist', lefty: false };
const S = Object.assign({}, DEF);
try { Object.assign(S, JSON.parse(localStorage.getItem(SET_KEY) || '{}')); } catch (e) { /* defaults */ }
if (localStorage.getItem('renas-rocket-rumble-vrview') === '1st') S.view = '1st';   // the older 1st/3rd switch
G.vrSet = S;   // main.js reads S.sil (Rênas's silhouette behind walls)
const saveSet = () => { try { localStorage.setItem(SET_KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } };
let firstPerson = S.view === '1st';
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local-floor');

const nl = () => LANG.cur === 'nl';
const rig = new THREE.Group();
let session = null, saved = null;

// ---------- the loop ----------
export function startLoop(frame) { renderer.setAnimationLoop(frame); }

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
function begin(s) {
  session = s; G.vr = true; label();
  saved = { fov: camera.fov, aspect: camera.aspect, bg: scene.background };
  if (document.pointerLockElement) document.exitPointerLock();
  try { renderer.xr.setFoveation(1); } catch (e) { /* not every browser */ }
  scene.add(rig); scene.add(fx); scene.add(stars); applySet();
  s.addEventListener('selectstart', (e) => (sel[e.inputSource.handedness] = true));
  s.addEventListener('selectend', (e) => (sel[e.inputSource.handedness] = false));
  s.addEventListener('squeezestart', (e) => (sqz[e.inputSource.handedness] = true));
  s.addEventListener('squeezeend', (e) => (sqz[e.inputSource.handedness] = false));
  s.addEventListener('end', finish);
}
function finish() {
  session = null; G.vr = false; label();
  releaseAll();
  sel.left = sel.right = sqz.left = sqz.right = false;
  scene.remove(rig); scene.remove(fx); scene.remove(stars); rig.scale.setScalar(1); skyKey = '';
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
const _lk = new THREE.Vector3();
export function vrBegin() {
  if (!G.vr || !renderer.xr.isPresenting) return false;
  sp.copy(camera.position); sq.copy(camera.quaternion); su.copy(camera.up);
  const playing = (G.state === 'play' || G.state === 'over') && !G.cutscene;
  modelWas = model.root.visible;
  if (playing && firstPerson && P.planet && !P.hidden) {
    // 1st person: the rig stands on Rênas's feet, facing the camera's heading, and you don't see his body
    // (his shadow stays, so you can still see where you'll land)
    setRig(P.pos, P.up, cam.fwd, true, FP_SCALE);
    model.root.visible = false;
  }
  // 3rd person: the rig faces the camera's heading (not Rênas himself), so walking never turns your view.
  // The distance setting slides you closer to Rênas or further back along the line from him to the camera.
  else if (playing) { _lk.copy(P.pos).addScaledVector(P.up, 1.1); setRig(_lk.lerp(cam.pos, [0.6, 1, 1.35][S.dist] ?? 1), cam.up, cam.fwd); }
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
function toggleView() {
  firstPerson = !firstPerson; S.view = firstPerson ? '1st' : '3rd'; saveSet(); setMenu();
  toast(firstPerson ? '👀 1st person: you look through Rênas’s helmet' : '🎥 3rd person: you watch Rênas from behind', 1800);
}

// ---------- the VR settings menu ----------
// A normal menu page (so the VR menu control works on it), opened from the pause menu in VR, or from ⚙️ Settings
// on a computer that can do VR. Every button switches one setting to its next choice.
const OPTS = [
  ['view', ['3rd', '1st'], (v) => (nl() ? `👀 Kijken: ${v === '1st' ? '1e persoon (door de helm)' : '3e persoon (achter Rênas)'}` : `👀 View: ${v === '1st' ? '1st person (through the helmet)' : '3rd person (behind Rênas)'}`)],
  ['turn', [30, 45, 90, 0], (v) => (nl() ? `🔄 Draaien: ${v ? `stappen van ${v}°` : 'vloeiend'}` : `🔄 Turning: ${v ? `steps of ${v}°` : 'smooth'}`)],
  ['comfort', [0, 1, 2], (v) => (nl() ? `🌫 Comfortrand bij bewegen: ${['uit', 'zacht', 'sterk'][v]}` : `🌫 Comfort vignette when moving: ${['off', 'soft', 'strong'][v]}`)],
  ['dist', [0, 1, 2], (v) => (nl() ? `🎥 Afstand tot Rênas (3e persoon): ${['dichtbij', 'normaal', 'ver'][v]}` : `🎥 Distance to Rênas (3rd person): ${['close', 'normal', 'far'][v]}`)],
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
}
function applySet() {
  firstPerson = S.view === '1st';
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
main.m.position.set(0, 1.3, -1.6); main.m.rotation.x = 0.12;
// the hearts, bolts and gears: a little screen on your left wrist, like a watch (until a left controller shows up, it floats low in front of you)
const hud = panel(0.2, 0.067, 600, 200);
const HUD_FLOAT = () => { rig.add(hud.m); hud.m.scale.setScalar(3.4); hud.m.position.set(0, 0.85, -1.25); hud.m.rotation.set(-0.6, 0, 0); };
HUD_FLOAT();
function animPanel(p, dt, t, baseY) {
  p.k += ((p.on ? 1 : 0) - p.k) * Math.min(1, dt * 10);
  p.m.visible = p.k > 0.02;
  p.m.material.opacity = p.k;
  if (baseY !== undefined) { p.m.scale.setScalar(0.88 + 0.12 * p.k); p.m.position.y = baseY + Math.sin(t * 1.3) * 0.012; }
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
function buttonsOf(ov) { return [...ov.querySelectorAll('button')].filter((b) => shown(b) && txt(b)); }
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
    content = { menu: true, title, items: bs.map((b) => [txt(b).slice(0, 46), !!b.disabled]), sel: menuSel };
  } else {
    const d = $('dText'), sub = d && d.querySelector('small'), dlg = shown($('dialog')), rad = !dlg && shown($('radio'));
    const said = d ? [...d.childNodes].filter((n) => n !== sub).map((n) => n.textContent).join('').trim() : '';
    content = {
      who: dlg ? txt($('dWho')) : rad ? txt($('radioWho')) : '',
      col: dlg ? $('dWho').style.background || '#2b2440' : '#2b2440',
      say: dlg ? said : rad ? txt($('radioTxt')) : '',
      radio: rad,
      sub: dlg && sub ? txt(sub) : '',
      lines: [['title', $('title')], ['banner', $('banner')], ['toast', $('toast')], ['prompt', $('prompt')], ['goal', G.state === 'play' && !G.cutscene ? $('goal') : null]]
        .filter(([, el]) => el && shown(el) && txt(el)).map(([k, el]) => [k, txt(el)]),
    };
  }
  const key = JSON.stringify(content);
  if (key === P_.key) return;
  P_.key = key;
  const empty = !content.menu && !content.say && !content.lines.length;
  P_.on = !empty;
  if (empty) return;
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
  const boss = shown($('boss')) ? txt($('bossName')) : '';
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
let fxKey = '', barsK = 0, comfortK = 0;
const op = (el) => (el ? +getComputedStyle(el).opacity || 0 : 0);
function edgeGlow(x, S, col, a, inner) {
  const g = x.createRadialGradient(S / 2, S / 2, S * inner, S / 2, S / 2, S * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, col);
  x.globalAlpha = a; x.fillStyle = g; x.fillRect(0, 0, S, S); x.globalAlpha = 1;
}
function drawFx(dt) {
  barsK += ((document.body.classList.contains('cutscene') ? 1 : 0) - barsK) * Math.min(1, dt * 6);
  const hurt = op($('hurt')), dark = Math.max(0, ...[...document.querySelectorAll('.darkFx')].map(op)), tints = [...document.querySelectorAll('.vrTint')].map((e) => [e.dataset.vr || '#b07aff', op(e)]).filter(([, a]) => a > 0.02);
  const inks = [...document.querySelectorAll('.inkFx i')].map((e) => { const r = e.getBoundingClientRect(); return [(r.left + r.width / 2) / innerWidth, (r.top + r.height / 2) / innerHeight, r.width / innerWidth]; }).filter((v) => v[2] > 0.005);
  fadeBall.material.opacity = op($('fade'));
  fadeBall.visible = fadeBall.material.opacity > 0.01;
  const key = [hurt, dark, barsK, Math.round(comfortK * 20) / 20, ...tints.flat(), ...inks.flat()].map((v) => (typeof v === 'number' ? v.toFixed(2) : v)).join(',');
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
  uiT -= dt; if (uiT <= 0) { uiT = 0.1; drawMain(); drawHud(); drawSky(); }
  drawFx(dt); twinkle(G.t || 0);
  animPanel(main, dt, G.t || 0, 1.3); animPanel(hud, dt, G.t || 0);

  // ----- menus -----
  const ov = overlayNow();
  if (ov) {
    releaseAll(); comfortK = 0;
    const bs = buttonsOf(ov);
    const sy = Math.abs(ly) > Math.abs(ry) ? ly : ry;
    const down = edge('mDown', sy > 0.6), up = edge('mUp', sy < -0.6);
    if (sy > -0.3 && sy < 0.3) { prev.mDown = prev.mUp = false; }
    if ((down || up) && bs.length) { menuSel = (menuSel + (down ? 1 : -1) + bs.length) % bs.length; buzz(H.right || H.left, 0.2); main.key = ''; uiT = 0; }
    if (edge('mOk', trigR || trigL || A) && bs[menuSel] && !bs[menuSel].disabled) { buzz(H.right, 0.5); bs[menuSel].click(); menuOv = null; main.key = ''; uiT = 0; }
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
  vk('KeyW', ly < -dz); vk('KeyS', ly > dz); vk('KeyA', lx < -dz); vk('KeyD', lx > dz);
  vk('ShiftLeft', Math.hypot(lx, ly) > 0.92 || btn('left', 3));
  vk('Space', trigR || A);
  vk('KeyF', gripR);
  vk('KeyX', trigL);
  vk('KeyC', gripL);
  vk('KeyE', B || X);
  if (edge('view', btn('right', 3)) && G.state === 'play' && !G.cutscene) { toggleView(); buzz(H.right, 0.4); }
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
