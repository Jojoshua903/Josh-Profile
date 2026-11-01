import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { S, sfx } from './core.js';
import { Comms } from './comms.js';

const $ = id => document.getElementById(id);
const ease = k => k * k * (3 - 2 * k);
const OX = -3000; // the white void is built far from the city

export function createMemoryCutscene({ scene, camera, L, P, bg, onDone }) {
  const set = new THREE.Group(); set.position.set(OX, 0, 0); scene.add(set);
  const void_ = new THREE.Mesh(new THREE.SphereGeometry(60, 24, 16), new THREE.MeshBasicMaterial({ color: 0xfbf7ee, side: THREE.BackSide, fog: false })); set.add(void_);
  const ink = new THREE.MeshBasicMaterial({ color: 0x1d1b16, side: THREE.DoubleSide, fog: false });
  const strokes = [];
  for (let i = 0; i < 26; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(.08 + Math.random() * .25, 2 + Math.random() * 6), ink);
    const a = Math.random() * 6.3, r = 6 + Math.random() * 14; m.position.set(Math.cos(a) * r, (Math.random() - .5) * 10, Math.sin(a) * r - 6); m.rotation.set(Math.random(), Math.random(), Math.random()); set.add(m); strokes.push({ m, a, r, sp: .05 + Math.random() * .15, y: m.position.y });
  }
  const mask = new THREE.Group(); mask.position.set(0, 1.6, -5); set.add(mask);
  const hood = new THREE.Mesh(new THREE.SphereGeometry(.6, 20, 14), new THREE.MeshLambertMaterial({ color: 0x2a2a28 })); hood.scale.set(1, 1.15, .9); mask.add(hood);
  const band = new THREE.Mesh(new THREE.TorusGeometry(.6, .07, 8, 28), new THREE.MeshBasicMaterial({ color: 0xc8321e, fog: false })); band.rotation.x = Math.PI / 2; band.position.y = .16; mask.add(band);
  for (const x of [-.2, .2]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0xf2b51c, fog: false })); eye.position.set(x, .03, .52); mask.add(eye); }
  const tails = [0, 1].map(i => { const t = new THREE.Mesh(new THREE.PlaneGeometry(.16, 1.4), band.material); t.position.set(.2 - i * .1, .1, -.6); set.add(t); mask.add(t); return t; });
  const key = new THREE.PointLight(0xffffff, 30, 20, 1.4); key.position.set(OX + 1, 3, 2); scene.add(key);

  const fade = $('fade'), cap = $('cineCap'), wake = $('wake');
  let T = 0, phase = 'void', pT = 0, said = false, waiting = false, finished = false;
  document.body.classList.add('cinema'); $('cine').classList.remove('hidden'); wake.classList.add('hidden');
  scene.background.setHex(0xfbf7ee);
  fade.style.transition = 'none'; fade.style.opacity = 1; requestAnimationFrame(() => { fade.style.transition = 'opacity 2s'; fade.style.opacity = 0; });
  cap.textContent = 'BEHIND THE MOON DOOR'; cap.classList.add('show');

  function finish() {
    if (finished) return; finished = true; scene.remove(set); scene.remove(key); scene.background.setHex(bg); cap.classList.remove('show');
    document.body.classList.remove('cinema'); $('cine').classList.add('hidden'); fade.style.background = '#0d0c0a'; fade.style.transition = 'opacity .4s'; fade.style.opacity = 0; Comms.clear(); onDone();
  }
  const go = p => { phase = p; pT = 0; };

  return {
    get waiting() { return waiting; },
    click() { if (waiting) { wake.classList.add('hidden'); finish(); } else Comms.advance(); },
    skip: finish,
    update(dt) {
      if (finished) return;
      T += dt; pT += dt;
      for (const s of strokes) { s.a += dt * s.sp; s.m.position.x = Math.cos(s.a) * s.r; s.m.position.z = Math.sin(s.a) * s.r - 6; s.m.position.y = s.y + Math.sin(T * .5 + s.r) * .5; s.m.rotation.y += dt * .3; }
      if (phase === 'void') {
        camera.position.set(OX, 1.6, 2); camera.up.set(0, 1, 0); camera.lookAt(OX + mask.position.x, mask.position.y, mask.position.z);
        mask.position.y = 1.6 + Math.sin(T * 1.1) * .12; mask.rotation.y = Math.sin(T * .4) * .25; tails.forEach((t, i) => t.rotation.x = .3 + Math.sin(T * 2 + i) * .2);
        if (T > 3.5) cap.classList.remove('show');
        if (!said && T > 1) {
          said = true;
          [['RESH_TRUE', "Don't be afraid. You're not dead. You're inside me. Well. Inside what I remember."],
           ['DANIEL', 'You lied to me. Those stones were holding something in.'],
           ['RESH_TRUE', 'They were holding me in, Daniel. And something else. Something that sings.'],
           ['RESH_TRUE', 'The voice that called you small fire was never mine. It has been speaking through my signal for a very long time.'],
           ['DANIEL', 'Then who have I been talking to?'],
           ['RESH_TRUE', "Sometimes me. Sometimes it. After a thousand years even I can't always tell which."],
           ['RESH_TRUE', 'Three of my memories still hold the truth. The Choir has painted lies over them. Burn the lies off.'],
           ['RESH_TRUE', "Then you'll know what to do with me."]].forEach(([w, t]) => Comms.say(w, t));
        }
        if (said && Comms.idle() && T > 4) { go('lunge'); sfx.whisper(); }
      } else if (phase === 'lunge') { // the mask rushes at the camera, ink floods the frame
        const k = ease(Math.min(1, pT / 1.1)); mask.position.z = -5 + k * 6.4; mask.position.y = 1.6;
        camera.position.set(OX, 1.6, 2); camera.lookAt(OX, 1.6, mask.position.z);
        if (pT > .8 && fade.style.opacity !== '1') { fade.style.background = '#1d1b16'; fade.style.transition = 'opacity .3s'; fade.style.opacity = 1; sfx.ink(); }
        if (pT > 1.5) {
          go('city'); scene.background.setHex(bg); set.visible = false;
          fade.style.transition = 'opacity 2.2s'; fade.style.opacity = 0;
          cap.textContent = 'ULM-SAPHAR · A THOUSAND YEARS AGO · AS HE REMEMBERS IT'; cap.classList.add('show'); sfx.bell(392);
          Comms.say('VAULT', '...small fire... you cannot burn a memory...', 3.4);
          Comms.say('DANIEL', 'Watch me.', 1.6);
        }
      } else if (phase === 'city') { // crane down over the ink city to where Daniel stands
        const k = ease(Math.min(1, pT / 8.5)), cx = 12 * S, cz = 10 * S;
        const from = new THREE.Vector3(cx + 30, 42, cz + 60), to = new THREE.Vector3(P.x, 1.6, P.z);
        camera.position.lerpVectors(from, to, k);
        const look = new THREE.Vector3(cx, 2, cz).lerp(new THREE.Vector3(P.x - Math.sin(P.yaw) * 10, 1.6, P.z - Math.cos(P.yaw) * 10), k);
        camera.up.set(0, 1, 0); camera.lookAt(look);
        if (pT > 5) cap.classList.remove('show');
        if (pT > 8.5 && !waiting) { waiting = true; wake.textContent = 'Click to begin'; wake.classList.remove('hidden'); }
      }
    },
  };
}
