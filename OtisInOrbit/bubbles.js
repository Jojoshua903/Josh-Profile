import { THREE, clamp } from './core.js?v=muis1';
import * as sfx from './sfx.js?v=muis1';

// Passive dialogue: speech bubbles above characters, no button needed.
// A character speaks when you walk up to them (or past them). They won't repeat themselves
// while you stand around, only after a long pause, and they get a short cooldown so walking
// back and forth doesn't spam bubbles.
const layer = document.createElement('div');
layer.id = 'bubbles';
document.body.appendChild(layer);
const speakers = [];
const tmp = new THREE.Vector3();

// lines: array or () => array
export function addSpeaker(obj, { y = 2, lines = [], radius = 6, linger = 14, cooldown = 6, cond = () => true } = {}) {
  const el = document.createElement('div');
  el.className = 'bubble';
  layer.appendChild(el);
  const s = { obj, y, lines, radius, linger, cooldown, cond, el, show: 0, idx: -1, lastSet: null, inside: false, since: 99, quiet: 0 };
  s.say = (text, dur) => {
    el.innerHTML = text;
    // a little voice: Otis barks, goats bleat, everyone else gets a soft blip
    const plain = text.replace(/<[^>]+>/g, '');
    if (/^Woef/.test(plain)) sfx.bark(); else if (/^M[èe]+h/i.test(plain)) sfx.bleat(); else if (/^\*krijs/.test(plain)) sfx.squeak(); else sfx.blip();
    s.show = dur ?? clamp(1.8 + text.replace(/<[^>]+>/g, '').length * 0.05, 2.2, 5.5);
    s.since = 0;
  };
  s.next = () => {
    const L = typeof s.lines === 'function' ? s.lines() : s.lines;
    if (L !== s.lastSet) { s.idx = -1; s.lastSet = L; }        // new situation → start its lines from the top
    if (!L || !L.length) return;
    s.idx = (s.idx + 1) % L.length;
    s.say(L[s.idx]);
  };
  s.hush = () => { s.show = 0; };
  speakers.push(s);
  return s;
}

export function updateBubbles(dt, player, camera, paused) {
  camera.updateMatrixWorld();
  for (const s of speakers) {
    s.obj.getWorldPosition(tmp);
    const d = tmp.distanceTo(player);
    let visible = s.obj.visible !== false, top = s.obj;
    for (let p = s.obj.parent; p; p = p.parent) { if (p.visible === false) visible = false; top = p; }
    if (!top.isScene) visible = false;              // belongs to a planet you're not on right now
    s.since += dt;
    if (paused || !visible) s.show = 0;

    const inside = d < s.radius;
    if (!paused && visible && s.cond()) {
      if (inside && !s.inside && s.since > s.cooldown) s.next();          // you just walked up
      else if (inside && s.show <= 0 && s.since > s.linger) s.next();     // you've been hanging around a while
    }
    s.inside = inside;

    if (s.show > 0) {
      s.show -= dt;
      if (d > s.radius * 2) s.show = 0;
    }
    if (s.show > 0) {
      tmp.y += s.y;
      tmp.project(camera);
      const onScreen = tmp.z < 1 && Math.abs(tmp.x) < 1.15 && Math.abs(tmp.y) < 1.15;
      s.el.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * innerWidth}px, ${(-tmp.y * 0.5 + 0.5) * innerHeight}px) translate(-50%, -100%)`;
      s.el.style.opacity = onScreen ? clamp(1.6 - d / (s.radius * 1.8), 0.5, 1) * clamp(s.show * 4, 0, 1) : 0;
    } else s.el.style.opacity = 0;
  }
}
