import { V3 } from './core.js?v=sub1';
import * as sfx from './sfx.js?v=sub1';

// Cutscenes: a list of steps. Each step can move the camera, run animation code, and show a line
// of dialogue (with an optional Byte translation underneath, for when Otis is barking).
// E / Space / Enter = next line, Esc = skip the whole scene.
export const cs = { active: false, steps: [], i: -1, t: 0, adv: false, skip: false, onEnd: null, text: '', sub: '', shown: 0 };

const dEl = document.getElementById('dialog'), dText = document.getElementById('dText'), dWho = document.getElementById('dWho');
const bars = document.createElement('div');
bars.id = 'letterbox';
bars.innerHTML = '<i></i><i></i><span>Esc · overslaan</span>';
document.body.appendChild(bars);

addEventListener('keydown', (e) => {
  if (!cs.active) return;
  if (['KeyE', 'Space', 'Enter'].includes(e.code)) { cs.adv = true; e.preventDefault(); }
  if (e.code === 'Escape') cs.skip = true;
});
addEventListener('pointerdown', () => { if (cs.active) cs.adv = true; });

const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
const esc = (s) => s.replace(/</g, '&lt;');

export function play(steps, onEnd) {
  cs.active = true; cs.steps = steps; cs.i = -1; cs.onEnd = onEnd; cs.skip = false;
  document.body.classList.add('cutscene');
  next();
}

function next() {
  const prev = cs.steps[cs.i];
  if (prev && prev.finish) prev.finish();
  cs.i++; cs.t = 0; cs.adv = false;
  const s = cs.steps[cs.i];
  if (!s) return end();
  if (s.start) s.start();
  if (s.say) {
    dWho.textContent = s.say.who; cs.text = s.say.text; cs.sub = s.say.sub || ''; cs.shown = 0;
    dText.innerHTML = ''; dEl.classList.add('show');
    if (s.say.who === 'OTIS') sfx.bark(); else sfx.blip();
  } else dEl.classList.remove('show');
}

function end() {
  cs.active = false;
  document.body.classList.remove('cutscene');
  dEl.classList.remove('show');
  const f = cs.onEnd; cs.onEnd = null;
  if (f) f();
}
// stop whatever is playing without running its callbacks (used when leaving a planet)
export function endCutscene() {
  cs.active = false; cs.steps = []; cs.onEnd = null;
  document.body.classList.remove('cutscene');
  dEl.classList.remove('show');
}

function camAt(c, k) {
  if (!c.from) return { pos: c.pos, look: c.look };
  const e = ease(k);
  return { pos: c.from.pos.clone().lerp(c.to.pos, e), look: c.from.look.clone().lerp(c.to.look, e) };
}

export function updateCutscene(dt, camera) {
  if (!cs.active) return;
  if (cs.skip) {
    const cur = cs.steps[cs.i];
    if (cur && cur.finish) cur.finish();
    for (let k = cs.i + 1; k < cs.steps.length; k++) {
      const s = cs.steps[k];
      if (s.start) s.start();
      if (s.finish) s.finish();
    }
    cs.i = cs.steps.length;
    return end();
  }
  const s = cs.steps[cs.i];
  cs.t += dt;
  const dur = s.dur ?? 2;
  const k = Math.min(1, cs.t / dur);
  if (s.update) s.update(dt, k, cs.t);
  if (s.cam) {
    const c = typeof s.cam === 'function' ? s.cam(k, cs.t) : camAt(s.cam, k);
    camera.position.copy(c.pos);
    camera.lookAt(c.look);
  }
  if (s.say) {
    const done = cs.shown >= cs.text.length;
    if (!done) {
      cs.shown = Math.min(cs.text.length, cs.shown + dt * 42);
      dText.textContent = cs.text.slice(0, Math.floor(cs.shown));
      if (cs.shown >= cs.text.length) dText.innerHTML = esc(cs.text) + (cs.sub ? `<small class="tr">${esc(cs.sub)}</small>` : '');
    }
    if (cs.adv) {
      cs.adv = false;
      if (!done) { cs.shown = cs.text.length; dText.innerHTML = esc(cs.text) + (cs.sub ? `<small class="tr">${esc(cs.sub)}</small>` : ''); }
      else if (cs.t > 0.25) next();
    } else if (done && cs.t > dur + 2.5 + (cs.text.length + cs.sub.length) * 0.045) next();   // controller-friendly fallback
  } else if (cs.t >= dur) next();
}

// helper for camera framing
export const shot = (pos, look) => ({ pos, look });
export const pan = (fromPos, fromLook, toPos, toLook) => ({ from: { pos: fromPos, look: fromLook }, to: { pos: toPos, look: toLook } });
export { V3 };
