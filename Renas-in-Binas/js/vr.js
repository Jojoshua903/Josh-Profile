import { THREE, G, renderer, scene, camera, anyPerp, $, toast } from './core.js?v=20261114b';
import { initAudio } from './audio.js?v=20261114b';
import { tr, LANG } from './lang.js?v=20261114b';
import { P, keys, pressed, cam, model } from './player.js?v=20261114b';

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
//   menus: either stick up/down = choose · trigger or A = OK · B = back
// With hand tracking a pinch is the same as the trigger.

const EYE = 1.5;           // the headset adds your real eye height (about 1.5 m) on top of the rig
const SNAP = Math.PI / 6;  // 30° snap turn
// 1st person: you stand inside Rênas. He is a kid, so the rig is shrunk: your real eye height (about 1.5 m)
// then lands at the height of his eyes, and the world around you looks as big as it does to him.
const FP_SCALE = 0.68;
const VIEW_KEY = 'renas-rocket-rumble-vrview';
let firstPerson = localStorage.getItem(VIEW_KEY) === '1st';
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
  navigator.xr.isSessionSupported('immersive-vr').then((ok) => { if (ok) { label(); btn.style.display = 'block'; } }).catch(() => {});
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
  scene.add(rig);
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
  scene.remove(rig); rig.scale.setScalar(1);
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
}
let modelWas = true;
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
  // 3rd person: the rig faces the camera's heading (not Rênas himself), so walking never turns your view
  else if (playing) setRig(cam.pos, cam.up, cam.fwd);
  else setRig(camera.position, camera.up, _f.set(0, 0, -1).applyQuaternion(camera.quaternion));
  rig.add(camera);
  camera.position.set(0, 0, 0); camera.quaternion.identity(); camera.up.set(0, 1, 0);
  rig.updateMatrixWorld(true);
  return true;
}
export function vrEnd() {
  rig.remove(camera);
  model.root.visible = modelWas;
  camera.position.copy(sp); camera.quaternion.copy(sq); camera.up.copy(su);
  camera.updateMatrixWorld();
}
function toggleView() {
  firstPerson = !firstPerson;
  localStorage.setItem(VIEW_KEY, firstPerson ? '1st' : '3rd');
  toast(firstPerson ? '👀 1st person: you look through Rênas’s helmet' : '🎥 3rd person: you watch Rênas from behind', 1800);
}

// ---------- the floating panels ----------
function panel(w, h, cw, ch) {
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, fog: false, toneMapped: false }));
  m.renderOrder = 999; m.visible = false; m.frustumCulled = false; rig.add(m);
  return { m, cv, x: cv.getContext('2d'), tex, key: '' };
}
const main = panel(1.5, 0.75, 1024, 512);
main.m.position.set(0, 1.3, -1.6); main.m.rotation.x = 0.12;
const hud = panel(0.9, 0.12, 768, 102);
hud.m.position.set(0, 0.9, -1.25); hud.m.rotation.x = -0.6;

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
function bg(x, W, H) {
  x.clearRect(0, 0, W, H);
  x.fillStyle = 'rgba(20,16,40,.86)'; x.strokeStyle = 'rgba(255,248,236,.5)'; x.lineWidth = 6;
  x.beginPath(); x.roundRect(4, 4, W - 8, H - 8, 34); x.fill(); x.stroke();
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
    const d = $('dText'), sub = d && d.querySelector('small');
    const said = d ? [...d.childNodes].filter((n) => n !== sub).map((n) => n.textContent).join('').trim() : '';
    content = {
      who: shown($('dialog')) ? txt($('dWho')) : shown($('radio')) ? txt($('radioWho')) : '',
      say: shown($('dialog')) ? said : shown($('radio')) ? txt($('radioTxt')) : '',
      sub: shown($('dialog')) && sub ? txt(sub) : '',
      lines: [['title', $('title')], ['banner', $('banner')], ['toast', $('toast')], ['prompt', $('prompt')], ['goal', G.state === 'play' && !G.cutscene ? $('goal') : null]]
        .filter(([, el]) => el && shown(el) && txt(el)).map(([k, el]) => [k, txt(el)]),
    };
  }
  const key = JSON.stringify(content);
  if (key === P_.key) return;
  P_.key = key;
  const empty = !content.menu && !content.say && !content.lines.length;
  P_.m.visible = !empty;
  if (empty) return;
  bg(x, W, H);
  x.textBaseline = 'top'; x.textAlign = 'left';
  let y = 34;
  if (content.menu) {
    x.fillStyle = '#ffd23a'; x.font = '800 38px system-ui,sans-serif';
    for (const t of content.title) { for (const l of wrap(x, t, W - 80).slice(0, 2)) { x.fillText(l, 40, y); y += 44; } x.font = '600 28px system-ui,sans-serif'; x.fillStyle = '#d9c8ff'; }
    y += 8;
    const rows = Math.max(1, Math.floor((H - y - 60) / 40)), from = Math.max(0, Math.min(content.sel - Math.floor(rows / 2), content.items.length - rows));
    x.font = '700 30px system-ui,sans-serif';
    content.items.slice(from, from + rows).forEach(([t, off], k) => {
      const i = from + k, on = i === content.sel;
      if (on) { x.fillStyle = '#ffd23a'; x.beginPath(); x.roundRect(30, y - 4, W - 60, 38, 12); x.fill(); }
      x.fillStyle = on ? '#1a1030' : off ? 'rgba(255,248,236,.35)' : '#fff8ec';
      x.fillText((on ? '▶ ' : '   ') + t, 44, y); y += 40;
    });
    x.font = '600 22px system-ui,sans-serif'; x.fillStyle = 'rgba(255,248,236,.6)';
    x.fillText(nl() ? '🕹 stick = kiezen · trigger / A = OK · B = terug' : '🕹 stick = choose · trigger / A = OK · B = back', 40, H - 44);
  } else {
    if (content.say) {
      if (content.who) { x.font = '800 30px system-ui,sans-serif'; x.fillStyle = '#ffd23a'; x.fillText(content.who, 40, y); y += 42; }
      x.font = '600 32px system-ui,sans-serif'; x.fillStyle = '#fff8ec';
      for (const l of wrap(x, content.say, W - 80).slice(0, 6)) { x.fillText(l, 40, y); y += 40; }
      if (content.sub) { x.font = 'italic 500 26px system-ui,sans-serif'; x.fillStyle = '#c8b8ff'; for (const l of wrap(x, content.sub, W - 80).slice(0, 3)) { x.fillText(l, 40, y); y += 32; } }
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
  const show = (G.state === 'play' || G.state === 'over') && !G.cutscene && !overlayNow();
  hud.m.visible = show;
  if (!show) return;
  const boss = shown($('boss')) ? `   ·   👾 ${txt($('bossName'))}` : '';
  const key = `${P.hp}/${P.maxHp}/${G.coins}/${txt($('rareN'))}${boss}`;
  if (key === hud.key) return;
  hud.key = key;
  const x = hud.x, W = hud.cv.width, H = hud.cv.height;
  bg(x, W, H);
  x.font = '800 40px system-ui,sans-serif'; x.textBaseline = 'middle'; x.textAlign = 'center'; x.fillStyle = '#fff8ec';
  x.fillText(`${'❤'.repeat(Math.max(0, P.hp))}${'♡'.repeat(Math.max(0, P.maxHp - P.hp))}   🔩 ${G.coins || 0}   ⚙ ${txt($('rareN'))}${boss}`, W / 2, H / 2 + 2);
  hud.tex.needsUpdate = true;
}

// ---------- the sky ----------
// On a screen the sky is the page's CSS background behind a see-through canvas. A headset doesn't show the page,
// so the same colours are painted onto a sky dome.
const skyCv = document.createElement('canvas'); skyCv.width = 256; skyCv.height = 256;
const skyTex = new THREE.CanvasTexture(skyCv); skyTex.mapping = THREE.EquirectangularReflectionMapping; skyTex.colorSpace = THREE.SRGBColorSpace;
let skyKey = '';
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
  // read both hands
  const H = { left: null, right: null };
  for (const src of session.inputSources) if (src.handedness in H) H[src.handedness] = src;
  const pad = (h) => (H[h] && H[h].gamepad) || null;
  const btn = (h, i) => { const g = pad(h); return !!(g && g.buttons[i] && g.buttons[i].pressed); };
  const stick = (h) => { const g = pad(h); if (!g) return [0, 0]; const a = g.axes, o = a.length >= 4 ? 2 : 0; return [a[o] || 0, a[o + 1] || 0]; };
  const [lx, ly] = stick('left'), [rx, ry] = stick('right');
  const trigR = sel.right, trigL = sel.left;
  const gripR = sqz.right || btn('right', 1), gripL = sqz.left || btn('left', 1);
  const A = btn('right', 4), B = btn('right', 5), X = btn('left', 4), Y = btn('left', 5);

  // panels: redrawn ten times a second at most
  uiT -= dt; if (uiT <= 0) { uiT = 0.1; drawMain(); drawHud(); drawSky(); }

  // ----- menus -----
  const ov = overlayNow();
  if (ov) {
    releaseAll();
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
  // snap turn: the camera jumps round Rênas in one go instead of gliding (gliding is what makes you seasick)
  const turnR = edge('tR', rx > 0.7), turnL = edge('tL', rx < -0.7);
  if (rx > -0.3 && rx < 0.3) prev.tR = prev.tL = false;
  if ((turnR || turnL) && G.state === 'play' && !G.cutscene && P.up) {
    const a = turnR ? -SNAP : SNAP;
    cam.fwd.applyAxisAngle(P.up, a);
    cam.pos.sub(P.pos).applyAxisAngle(P.up, a).add(P.pos);
    buzz(H.right, 0.15);
  }
  if (edge('Y', Y)) tap(G.cutscene ? 'Escape' : 'KeyP');
}
