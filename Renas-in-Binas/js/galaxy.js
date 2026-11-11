import { THREE, $, clamp } from './core.js?v=20261112d';
import { sfx } from './audio.js?v=20261112d';
import { orbitAngle } from './systems.js?v=20261112d';

// THE PLANET PICKER, like the galaxy map in Mario Galaxy: one planet at a time, slowly turning, and you
// scroll left and right through all of them (arrows, mouse wheel, A/D or the arrow keys, or swipe).
// The model is the real planet: its world is built once, taken out of the game scene and shown here on
// its own little stage, without the far-away bits (the boss arena, the background planets).
let api = null, R = null, stage = null, cam = null, items = [], at = 0, shown = false, cur = null, anim = 0, wheelAcc = 0, wheelT = 0;
const cache = new Map(), tmp = new THREE.Vector3();

export function initGalaxy(a) {
  api = a;
  $('galPrev').onclick = () => step(-1);
  $('galNext').onclick = () => step(1);
  $('galGo').onclick = () => go();
  const st = $('galStage');
  st.addEventListener('wheel', (e) => {
    if (!shown) return;
    e.preventDefault();
    wheelAcc += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    const now = performance.now();
    if (Math.abs(wheelAcc) > 40 && now - wheelT > 260) { step(Math.sign(wheelAcc)); wheelAcc = 0; wheelT = now; }
  }, { passive: false });
  let downX = null;
  st.addEventListener('pointerdown', (e) => { downX = e.clientX; });
  st.addEventListener('pointerup', (e) => { if (downX !== null && Math.abs(e.clientX - downX) > 40) step(e.clientX < downX ? 1 : -1); downX = null; });
  addEventListener('keydown', (e) => {
    if (!shown || e.repeat) return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') step(-1);
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') step(1);
    else if (e.code === 'Enter') go();
  });
}

export function openGalaxy(list, startIdx) {
  items = list;
  if (!R) {
    R = new THREE.WebGLRenderer({ canvas: $('galCv'), antialias: true, alpha: true });
    R.outputColorSpace = THREE.SRGBColorSpace; R.setClearColor(0x000000, 0);
    stage = new THREE.Scene();
    stage.add(new THREE.AmbientLight(0xffffff, 0.8));
    const sun = new THREE.DirectionalLight(0xfff2dd, 1.5); sun.position.set(1.2, 1.4, 1.6); stage.add(sun);
    stage.userData.hemi = new THREE.HemisphereLight(0xdfe6ff, 0x6a5a7a, 0.55); stage.add(stage.userData.hemi);
    cam = new THREE.PerspectiveCamera(40, 1, 0.5, 3000);
  }
  shown = true;
  const i = items.findIndex((it) => it.idx === startIdx);
  show(i >= 0 ? i : 0, 0);
}
export function closeGalaxy() {
  if (!shown && !cache.size) return;
  shown = false; cur = null;
  for (const p of cache.values()) {
    if (!p.w) continue;
    stage.remove(p.w.group);
    try { p.w.destroy(); } catch (e) { /* already gone */ }
    p.w.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  }
  cache.clear();
}
export const galaxyOpen = () => shown;

function step(d) {
  if (!shown || !items.length) return;
  sfx.move();
  show((at + d + items.length) % items.length, d);
}
function go() {
  const it = items[at];
  if (!it) return;
  if (!it.open) { sfx.warn(); return; }
  sfx.select(); it.go();
}

function show(i, dir) {
  at = i;
  const it = items[i], nl = api.nl();
  $('galNum').textContent = `${i + 1} / ${items.length}`;
  $('galName').textContent = it.open ? it.name : '???';
  $('galInfo').innerHTML = it.info;
  $('galGo').textContent = it.open ? (nl ? '🚀 Vlieg erheen' : '🚀 Fly there') : (nl ? '🔒 Nog op slot' : '🔒 Still locked');
  $('galGo').classList.toggle('locked', !it.open);
  $('galLock').style.display = it.open ? 'none' : 'flex';
  $('galCv').style.filter = it.open ? '' : 'brightness(0.08) saturate(0)';   // a locked planet is a dark silhouette
  // which solar system, and where in it: the planet's sun glows in the corner of the stage
  const sy = it.sys, known = sy && items.some((x) => x.sys === sy && x.open);
  if (sy) {
    const mine = items.filter((x) => x.sys === sy);
    $('galSys').innerHTML = `<span class="sun"></span>${known ? (nl ? sy.nl : sy.en) : (nl ? 'Onbekend zonnestelsel' : 'Unknown solar system')} · ${mine.indexOf(it) + 1}/${mine.length}`;
    $('galStage').style.setProperty('--sun', sy.sun); $('galSys').style.setProperty('--sun', sy.sun);
  }
  const dots = $('galDots'); dots.innerHTML = '';
  items.forEach((x, k) => {
    const d = document.createElement('i'); d.style.setProperty('--c', x.col);
    if (!x.open) d.className = 'lock'; if (k === i) d.classList.add('on');
    if (k > 0 && x.sys !== items[k - 1].sys) d.classList.add('gap');   // a little space between solar systems
    d.title = x.open ? x.name : '???';
    d.onclick = () => { if (k !== at) { sfx.move(); show(k, k > at ? 1 : -1); } };
    dots.appendChild(d);
  });
  // build the model a frame later, so the name and arrows react right away even if building takes a moment
  const want = it.idx;
  requestAnimationFrame(() => { if (shown && items[at] && items[at].idx === want) setModel(want, dir); });
}

function preview(idx) {
  if (cache.has(idx)) return cache.get(idx);
  let p = { w: null };
  try {
    const w = api.build(idx);
    if (w.group.parent) w.group.parent.remove(w.group);
    for (const b of w.bubbles) b.el.remove();   // speech bubbles are page elements: not wanted here
    w.bubbles = [];
    const m = w.main, c = m.c, rad = m.r * (m.shape ? 1.3 : 1) + (w.park ? 10 : 3);
    w.group.updateMatrixWorld(true);
    w.group.traverse((o) => {
      if (o === w.group || o.isPoints) return;   // keep the stars
      if (!o.isMesh && !o.isSprite) return;
      const pr = o.geometry && o.geometry.parameters;
      if (pr && pr.radius >= 40 && o.material && o.material.side === THREE.BackSide) { o.visible = false; return; }   // the dome round a parkour planet
      if (o.getWorldPosition(tmp).distanceTo(c) > rad * 1.6) o.visible = false;   // the arena, background planets
    });
    p = { w, c: c.clone(), rad, sky: w.sky, lights: w.lights };
  } catch (e) { setTimeout(() => { throw e; }); }
  cache.set(idx, p);
  return p;
}

function setModel(idx, dir) {
  if (cur && cur.w) stage.remove(cur.w.group);
  cur = preview(idx);
  $('galStage').style.background = cur.sky || items[at].col;
  if (!cur.w) return;
  stage.add(cur.w.group);
  if (cur.lights) { stage.userData.hemi.color.setHex(cur.lights[0]); stage.userData.hemi.groundColor.setHex(cur.lights[1]); }
  cur.spin = cur.spin ?? 0.6;
  cur.dir = dir || 0;
  anim = 0;
}

export function galaxyTick(dt) {
  if (!shown || !R) return;
  const cv = $('galCv'), W = cv.clientWidth, H = cv.clientHeight;
  if (!W || !H) return;
  if (cv.width !== Math.round(W * R.getPixelRatio()) || cv.height !== Math.round(H * R.getPixelRatio())) { R.setPixelRatio(Math.min(devicePixelRatio, 1.5)); R.setSize(W, H, false); }
  cam.aspect = W / H; cam.updateProjectionMatrix();
  if (cur && cur.w) {
    anim = Math.min(1, anim + dt * 2.8);
    const e = 1 - (1 - anim) ** 3;
    cur.spin += dt * 0.25;
    const g = cur.w.group;
    g.rotation.set(0.18, cur.spin - cur.dir * (1 - e) * 0.9, 0);   // a new planet swings in from the side you scrolled to
    g.scale.setScalar(0.65 + 0.35 * e);
    const d = cur.rad * (W / H < 1.2 ? 4.4 : 3.6);
    cam.position.set(cur.c.x, cur.c.y + cur.rad * 0.55, cur.c.z + d);
    cam.lookAt(cur.c);
  }
  R.render(stage, cam);
  drawOrrery(dt);
}

// ---------- the solar-system map in the corner of the stage ----------
// The sun in the middle, the system's planets going round it on tilted orbits (the same orbits as in the sky
// of the planets). The planet you're looking at is big and has a ring round it. Click a planet to jump to it.
let orr = null, orrT = 0, orrHit = [];
const OW = 210, OH = 128;
function orrery() {
  if (orr) return orr;
  orr = document.createElement('canvas');
  orr.style.cssText = `position:absolute;left:8px;bottom:8px;width:${OW}px;height:${OH}px;border-radius:14px;background:rgba(12,8,30,.55);border:3px solid rgba(255,248,236,.25);cursor:pointer;z-index:2`;
  const dpr = Math.min(devicePixelRatio || 1, 2); orr.width = OW * dpr; orr.height = OH * dpr; orr.getContext('2d').scale(dpr, dpr);
  for (const ev of ['pointerdown', 'pointerup']) orr.addEventListener(ev, (e) => e.stopPropagation());   // not a swipe
  orr.addEventListener('click', (e) => {
    const b = orr.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top;
    let best = null, bd = 14;
    for (const h of orrHit) { const d = Math.hypot(h.x - x, h.y - y); if (d < bd) { bd = d; best = h; } }
    if (best && best.k !== at) { sfx.move(); show(best.k, best.k > at ? 1 : -1); }
  });
  $('galStage').appendChild(orr);
  return orr;
}
function drawOrrery(dt) {
  const it = items[at]; if (!it || !it.sys) return;
  const cv = orrery(), x = cv.getContext('2d'), sy = it.sys;
  orrT += Math.min(dt, 0.1);
  const cx = OW / 2, cy = OH / 2 + 4, TILT = 0.42;
  x.clearRect(0, 0, OW, OH);
  // the system's planets, in the order of their orbits
  const mine = sy.planets.map((pi) => items.findIndex((q) => q.idx === pi)).filter((k) => k >= 0);
  const gap = (OW / 2 - 18) / Math.max(1, mine.length);
  const pos = mine.map((k, n) => {
    const r = 22 + n * gap, a = orbitAngle(n, orrT * 6);   // the map runs faster than the sky, so you can see it move
    return { k, n, r, x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * TILT, back: Math.sin(a) < 0 };
  });
  // orbits
  for (const p of pos) {
    x.beginPath(); x.ellipse(cx, cy, p.r, p.r * TILT, 0, 0, 6.2832);
    x.strokeStyle = p.k === at ? sy.sun : 'rgba(255,248,236,.2)'; x.lineWidth = p.k === at ? 2 : 1.2; x.stroke();
  }
  const planet = (p) => {
    const q = items[p.k], me = p.k === at, rad = me ? 7 : 4.5;
    if (me) { x.beginPath(); x.arc(p.x, p.y, rad + 4 + Math.sin(orrT * 5) * 1.5, 0, 6.2832); x.strokeStyle = '#fff8ec'; x.lineWidth = 2; x.stroke(); }
    x.beginPath(); x.arc(p.x, p.y, rad, 0, 6.2832);
    x.fillStyle = q.open ? q.col : '#2b2440'; x.fill();
    x.strokeStyle = q.open ? '#2b2440' : 'rgba(255,248,236,.45)'; x.lineWidth = 2; x.stroke();
    if (q.open) { x.beginPath(); x.arc(p.x - rad * 0.35, p.y - rad * 0.35, rad * 0.3, 0, 6.2832); x.fillStyle = 'rgba(255,255,255,.55)'; x.fill(); }
  };
  // planets behind the sun first, then the sun, then the ones in front
  pos.filter((p) => p.back).forEach(planet);
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, 22);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, sy.sun); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.beginPath(); x.arc(cx, cy, 22, 0, 6.2832); x.fill();
  x.beginPath(); x.arc(cx, cy, 7, 0, 6.2832); x.fillStyle = sy.sun; x.fill(); x.strokeStyle = '#2b2440'; x.lineWidth = 2; x.stroke();
  pos.filter((p) => !p.back).forEach(planet);
  orrHit = pos;
  // the name of the planet you're looking at, next to it
  const me = pos.find((p) => p.k === at);
  if (me) {
    const nm = it.open ? it.name : '???';
    x.font = '800 10px system-ui, sans-serif'; x.textAlign = me.x > cx ? 'right' : 'left';
    const tx = me.x + (me.x > cx ? -12 : 12), ty = Math.max(10, Math.min(OH - 4, me.y - 8));
    x.lineWidth = 3; x.strokeStyle = '#2b2440'; x.strokeText(nm, tx, ty); x.fillStyle = '#fff8ec'; x.fillText(nm, tx, ty);
  }
}
void clamp;
export const galaxyIdx = () => (items[at] ? items[at].idx : 0);
