import { THREE, G, camera, V3, damp, $ } from './core.js?v=20261111s';
import { sfx } from './audio.js?v=20261111s';
import { tr } from './lang.js?v=20261111s';

// Cutscenes in the Otis in Orbit style: letterbox bars, scripted camera shots, typed dialogue with a mumbling voice for each character.
// A step: { say: { who, text, sub }, cam: () => ({ pos, look, up }), dur, start(), update(dt, k), title: [big, small], snap }
const VOICE = { 'RÊNAS': 620, MILO: 300, LARS: 760, NATHAN: 420, JOSH: 480, OTIS: 380, 'RENAS-1': 900, KAYO: 560, YARA: 680, KNABBEL: 180, '???': 500, ROSA: 560, TITO: 980, 'OPA GERRIT': 240, KIKI: 1000, MIES: 520, TIM: 880, PINGO: 340, DENIZ: 260, YUNA: 1050, HENK: 280, FIONN: 560, LORCAN: 820, SAOIRSE: 900, PADDY: 300, RESHMAN: 760, KOKOS: 160, ZARA: 700, BOBO: 1100, IMMANUEL: 520, SMEUL: 140, BRAM: 220, PIP: 1000, FARAH: 600, GRUIZEL: 110, PIM: 330, TESS: 880, NIEK: 700, SAMI: 680, MO: 720, JUUL: 340, BO: 820, KRAAK: 200, SAAR: 760, VLAD: 380, WENDY: 640, NOOR: 660, 'KONING BOE': 240, LUNA: 650, FENNA: 640, 'COACH KEES': 330, ELIF: 700, NIAMH: 660, KOFI: 420, MILA: 640, OMAR: 380, STERRE: 680, TIKTAK: 1200, TANDWIELTRON: 150, JIP: 880, ROOS: 700, KAI: 600, ASH: 900, DANIEL: 360, YASSIN: 300, ENNO: 560, THOMAS: 440, DEAN: 640, ROBIN: 340, NOVA: 720, BAS: 260 };
const COLOR = { 'RÊNAS': '#3a8ad8', MILO: '#e0306a', LARS: '#5a7ad8', NATHAN: '#2a4ae0', JOSH: '#e86a2a', OTIS: '#b07a3a', 'RENAS-1': '#14988a', KAYO: '#3a3640', YARA: '#d08a3a', KNABBEL: '#6a6678', ROSA: '#14a8a0', TITO: '#d8a020', 'OPA GERRIT': '#8a5a34', KIKI: '#d0508a', MIES: '#e03a3a', TIM: '#2a4ae0', PINGO: '#23263a', DENIZ: '#2a6ab0', YUNA: '#14a8c0', HENK: '#2a6ab0', FIONN: '#2a9a4a', LORCAN: '#14802a', SAOIRSE: '#2a9a4a', PADDY: '#8a6a4a', RESHMAN: '#8a5a34', KOKOS: '#3a3640', ZARA: '#a8803a', BOBO: '#3a8ad8', IMMANUEL: '#e05a2a', SMEUL: '#c8302a', BRAM: '#5a3a2a', PIP: '#ff7a3a', FARAH: '#14a8a0', GRUIZEL: '#a8743a', PIM: '#8a6a4a', TESS: '#e03a5a', NIEK: '#3a8ad8', SAMI: '#3ab0d8', MO: '#ff5ab4', JUUL: '#3a6a8a', BO: '#ff9ac8', KRAAK: '#8a3ab8', SAAR: '#9a7aff', VLAD: '#5a2a5a', WENDY: '#5a2a8a', NOOR: '#3a6a4a', 'KONING BOE': '#3aa87a', LUNA: '#ff5ab4', FENNA: '#e8a020', 'COACH KEES': '#2a4ae0', ELIF: '#ff5a6e', NIAMH: '#4aa84a', KOFI: '#a8802a', MILA: '#3ab0b0', OMAR: '#3a8ad8', STERRE: '#6a6ae0', TIKTAK: '#a8a8b0', TANDWIELTRON: '#c88a1a', JIP: '#ff5ab4', ROOS: '#d83a5a', KAI: '#2a8aa8', ASH: '#3c8dff', DANIEL: '#ff7a1f', YASSIN: '#d83a3a', ENNO: '#1fb5a6', THOMAS: '#ff5ab4', DEAN: '#8a5cff', ROBIN: '#3a8ad8', NOVA: '#3a8ad8', BAS: '#3a4a7a' };
// Each character's mumble. Most voices are made from their pitch above plus their name (so every one is a bit different);
// these have a voice written by hand. w: wave, fs: how big they sound (low = big), d: syllable length, range: how much the
// notes jump, vib: wobble, growl: raspy, click: ticks, every: letters per syllable, dry: how much plain tone
const VOX = {
  'RÊNAS': { w: 'sawtooth', fs: 1.15, range: 1.25, d: 0.065 },
  JOSH: { w: 'sawtooth', fs: 1.0, range: 1.1, d: 0.065 },
  OTIS: { w: 'triangle', fs: 0.95, vib: 5, d: 0.08 },
  KNABBEL: { w: 'square', fs: 0.75, growl: 1, range: 0.6, d: 0.09, every: 3 },
  'RENAS-1': { w: 'square', fs: 1.1, range: 0, click: 1, d: 0.05 },
  TIKTAK: { w: 'square', range: 0.3, click: 1, d: 0.035 },
  TANDWIELTRON: { w: 'square', fs: 0.7, range: 0, growl: 0.6, d: 0.1, every: 3 },
  'KONING BOE': { w: 'sine', fs: 0.85, vib: 7, dry: 0.6, d: 0.12, every: 3 },
  '???': { w: 'sine', vib: 9, dry: 0.7, range: 2 },
  'OPA GERRIT': { w: 'sawtooth', fs: 0.85, vib: 6, d: 0.1, every: 3 },
  'COACH KEES': { w: 'square', fs: 0.9, vol: 1.3, d: 0.06 },
  SMEUL: { fs: 0.65, growl: 1.5, d: 0.1, every: 3 },
  GRUIZEL: { fs: 0.6, growl: 1.6, d: 0.11, every: 3 },
  KRAAK: { w: 'square', fs: 1.1, growl: 0.8 },
  KOKOS: { fs: 0.7, d: 0.1 },
  BOBO: { fs: 1.4, range: 1.5, d: 0.045 }, PIP: { fs: 1.4, range: 1.5, d: 0.045 },
  KIKI: { fs: 1.35, range: 1.4, d: 0.05 }, YUNA: { fs: 1.35, range: 1.4, d: 0.05 },
};
const WAVES = ['sawtooth', 'square', 'triangle'];
const voices = {};
function voiceOf(who) {
  if (voices[who]) return voices[who];
  const base = VOICE[who] || 520;
  let h = 7; for (const ch of who) h = (h * 31 + ch.charCodeAt(0)) % 9973;
  const v = {
    p: base * 0.55, w: WAVES[h % 3], fs: Math.min(1.35, Math.max(0.7, 0.75 + base / 1600 + (h % 7) * 0.02)),
    d: 0.055 + (h % 4) * 0.01, range: 0.8 + (h % 5) * 0.15, vib: h % 6 === 0 ? 5 : 0, growl: 0, click: 0, every: 2, dry: 0.25, vol: 1,
  };
  return (voices[who] = Object.assign(v, VOX[who] || {}));
}
const dEl = $('dialog'), dText = $('dText'), dWho = $('dWho'), dMore = dEl.querySelector('.more'), titleEl = $('title');
const C = { on: false, steps: null, i: 0, t: 0, typed: 0, text: '', onEnd: null, camPos: V3(), camLook: V3(), camUp: V3(0, 1, 0), snapNext: true, blipT: 0 };

export const cutActive = () => C.on;
// who is speaking right now (for Rênas' talking animation), and whether the line is still being typed
export const cutSpeaker = () => { const s = C.on && C.steps && C.steps[C.i]; return s && s.say ? s.say.who : null; };
export const cutTyping = () => C.on && C.typed < C.text.length;
export function play(steps, onEnd) {
  C.on = true; G.cutscene = true;
  C.steps = steps.filter(Boolean); C.i = -1; C.onEnd = onEnd; C.snapNext = true;
  C.camPos.copy(camera.position); C.camUp.copy(camera.up);
  const d = V3(); camera.getWorldDirection(d); C.camLook.copy(camera.position).addScaledVector(d, 10);
  document.body.classList.add('cutscene');
  // the mouse stays locked during a conversation, so you don't have to click again afterwards
  next();
}
function next() {
  C.i++;
  if (C.i >= C.steps.length) return end(false);
  const s = C.steps[C.i];
  C.t = 0;
  if (s.snap) C.snapNext = true;
  if (s.start) s.start();
  if (s.title) showTitle(s.title[0], s.title[1], s.titleMs || 3200);
  if (s.say) {
    C.text = tr(s.say.text); C.typed = 0; C.doneT = 0;
    dWho.textContent = s.say.who;
    dWho.style.background = COLOR[s.say.who] || '#2b2440';
    dText.innerHTML = '';
    // the last line of a conversation says that E closes it
    const last = !C.steps.slice(C.i + 1).some((x) => x.say);
    dMore.textContent = tr(last ? 'E · close ✕' : 'E / Space ▸');
    dEl.classList.add('show');
  } else dEl.classList.remove('show');
}
function end(skipped) {
  const cb = C.onEnd;
  C.on = false; G.cutscene = false; C.steps = null;
  G.calmT = 1.5;   // enemies stay calm for a moment after a conversation, so they can't jump you the second it closes
  dEl.classList.remove('show');
  document.body.classList.remove('cutscene');
  if (skipped) titleEl.style.opacity = 0;
  if (cb) cb(skipped);
}
export function showTitle(big, small, ms = 3200) {
  titleEl.querySelector('.t').textContent = tr(big);
  titleEl.querySelector('.s').textContent = tr(small) || '';
  titleEl.style.transition = 'opacity .5s'; titleEl.style.opacity = 1;
  clearTimeout(showTitle.tm);
  showTitle.tm = setTimeout(() => (titleEl.style.opacity = 0), ms);
}
export function advance() {
  if (!C.on) return;
  const s = C.steps[C.i];
  if (s.say) {
    if (C.t < 0.3) return;                       // a key held from the last line can't skip this one
    if (C.typed < C.text.length) { C.typed = C.text.length; C.doneT = C.t; renderText(s); return; }
    if (C.t - C.doneT < 0.6) return;              // give a moment to read before the next line
    if (s.minT && C.t < s.minT) return;
    next();
  } else if (!s.dur || s.skippable) next();
}
export function skip() { if (C.on) end(true); }
function renderText(s) {
  dText.textContent = C.text.slice(0, Math.floor(C.typed));
  if (s.say.sub && C.typed >= C.text.length) {
    const sm = document.createElement('small'); sm.className = 'tr'; sm.textContent = tr(s.say.sub); dText.appendChild(sm);
  }
}
export function updateCut(dt) {
  if (!C.on) return;
  const s = C.steps[C.i];
  if (!s) return;
  C.t += dt;
  const k = s.dur ? Math.min(1, C.t / s.dur) : Math.min(1, C.t / 2);
  if (s.update) s.update(dt, k, C.t);
  if (s.say && C.typed < C.text.length) {
    const before = Math.floor(C.typed);
    C.typed = Math.min(C.text.length, C.typed + dt * 26);
    if (C.typed >= C.text.length) C.doneT = C.t;
    if (Math.floor(C.typed) !== before) {
      // a syllable every few letters, and always at the start of a word; spaces and punctuation stay quiet
      const ch = C.text[Math.floor(C.typed) - 1] || '';
      if (!/[\p{L}\p{N}]/u.test(ch)) C.blipT = 0;
      else if (--C.blipT <= 0) {
        const v = voiceOf(s.say.who);
        sfx.mumble(v, ch, /^[\p{L}]{0,2}\?/u.test(C.text.slice(Math.floor(C.typed))));
        C.blipT = v.every;
      }
      renderText(s);
    }
  }
  if (!s.say && s.dur && C.t >= s.dur) { next(); if (!C.on) return; }
  // camera
  const st = C.steps && C.steps[C.i];
  if (!st) return;
  let shot = typeof st.cam === "function" ? st.cam(C.t) : st.cam;
  if (typeof shot === "function") shot = shot(C.t);
  if (shot && (!shot.pos || !shot.look)) shot = null;
  if (shot) {
    const up = shot.up || (G.world && G.world.upAt ? G.world.upAt(shot.look) : V3(0, 1, 0));
    if (C.snapNext || st.snap) { C.camPos.copy(shot.pos); C.camLook.copy(shot.look); C.camUp.copy(up); C.snapNext = false; }
    else {
      const kk = damp(st.camK || 3.2, dt);
      C.camPos.lerp(shot.pos, kk); C.camLook.lerp(shot.look, kk); C.camUp.lerp(up, kk).normalize();
    }
  }
  camera.position.copy(C.camPos);
  if (G.shake > 0) camera.position.add(V3((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake));
  camera.up.copy(C.camUp);
  camera.lookAt(C.camLook);
}
// Helpers to build shots
export const shot = (pos, look, up) => ({ pos, look, up });
export function orbitShot(center, up, radius, height, speed, phase = 0) {
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  return (t) => {
    const u = up.clone().normalize();
    e1.copy(Math.abs(u.y) < 0.9 ? V3(0, 1, 0) : V3(1, 0, 0)).cross(u).normalize();
    e2.crossVectors(u, e1);
    const a = phase + t * speed;
    return { pos: center.clone().addScaledVector(e1, Math.cos(a) * radius).addScaledVector(e2, Math.sin(a) * radius).addScaledVector(u, height), look: center.clone(), up: u };
  };
}
