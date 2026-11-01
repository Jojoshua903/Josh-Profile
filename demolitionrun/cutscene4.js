import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { S, ROWS, COLS, sfx } from './core.js';
import { puff } from './effects.js';
import { Comms } from './comms.js';

const $ = id => document.getElementById(id);
const CX = COLS * S / 2;

export function buildTruck() {
  const g = new THREE.Group(), L = c => new THREE.MeshLambertMaterial({ color: c });
  const B = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), L(c)); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
  B(2.5, 1.9, 2.1, 0x8e3a34, 0, 1.55, -2.6); B(2.3, .7, .05, 0x9fc3cf, 0, 1.9, -3.66);
  B(2.6, .5, 5.6, 0x2b2a27, 0, .75, 0); B(2.5, .8, 3.8, 0x6f7348, 0, 1.4, 1);
  const tarp = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 3.8, 12, 1, false, 0, Math.PI), L(0x5b5f3a)); tarp.rotation.set(Math.PI / 2, 0, Math.PI / 2); tarp.position.set(0, 1.8, 1); g.add(tarp);
  for (const [x, z] of [[-1.3, -2.4], [1.3, -2.4], [-1.3, 1.6], [1.3, 1.6]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, .4, 12), L(0x1d1b16)); w.rotation.z = Math.PI / 2; w.position.set(x, .55, z); g.add(w); }
  return g;
}

export function createSaltCutscene({ scene, camera, L, P, bg, ending, onDone }) {
  const trucks = [0, 1, 2].map(() => { const t = buildTruck(); scene.add(t); return t; });
  const fade = $('fade'), cap = $('cineCap'), wake = $('wake');
  let T = 0, dustT = 0, said = false, waiting = false, finished = false;
  const fired = new Set(), at = (t, k, fn) => { if (T >= t && !fired.has(k)) { fired.add(k); fn(); } };
  const tz = (i, t) => 330 - 22 * t + i * 14;

  document.body.classList.add('cinema'); $('cine').classList.remove('hidden'); wake.classList.add('hidden');
  fade.style.background = '#0d0c0a'; fade.style.transition = 'none'; fade.style.opacity = 1; requestAnimationFrame(() => { fade.style.transition = 'opacity 1.8s'; fade.style.opacity = 0; });
  cap.textContent = 'SALTCROWN · THE WHITE FLATS · NINE DAYS LATER'; cap.classList.add('show');

  function finish() {
    if (finished) return; finished = true; trucks.forEach(t => scene.remove(t)); cap.classList.remove('show');
    document.body.classList.remove('cinema'); $('cine').classList.add('hidden'); fade.style.transition = 'opacity .4s'; fade.style.opacity = 0; Comms.clear(); onDone();
  }

  return {
    get waiting() { return waiting; },
    click() { if (waiting) { wake.classList.add('hidden'); finish(); } else Comms.advance(); },
    skip: finish,
    update(dt) {
      if (finished) return;
      T += dt;
      if (!said && T > .8) {
        said = true;
        const open = ending === 'Z'
          ? [['SAND', '...king... they are melting our glass... they are making it sing again...', 4], ['DANIEL', "I hear you. I hear you all the time now. It's getting old."]]
          : [['DANIEL', "Nine days of quiet. No voice in my ear. I'd almost started to miss him."]];
        [...open,
          ['MIRA', "Daniel? You don't know me. Mira. Watch signals corps, until about a week ago."],
          ['DANIEL', 'Who gave you this frequency?'],
          ['MIRA', "A dead man's diary. Commander Voss wrote everything down. Including you."],
          ['MIRA', 'Before the Vault closed, the Watch hauled ninety tonnes of its glass out. Grand Marshal Ashe has been melting it into a bell.'],
          ['MIRA', "A bell that sings. Ashe says it will make the Watch immortal. I've seen what happens to the people who stand near it."],
          ['DANIEL', 'Glass.'],
          ['MIRA', "Glass. When it rings, get out of its line of sight. Walls, crates, anything. Don't let it see you."],
          ['MIRA', "Three furnaces feed it. Break them, then break the bell. You're in the third truck. Get out when it stops."],
        ].forEach(([w, t, d]) => Comms.say(w, t, d));
      }
      if (T < 10.5) {
        trucks.forEach((tr, i) => { tr.position.set(CX + (i % 2 ? .6 : -.6), Math.sin(T * 9 + i) * .04, tz(i, T)); tr.rotation.z = Math.sin(T * 7 + i) * .015; });
        dustT -= dt; if (dustT <= 0) { dustT = .08; trucks.forEach(tr => puff(new THREE.Vector3(tr.position.x + (Math.random() - .5) * 2, .5, tr.position.z + 3.2), 1.2, 2.2, 0xf4efe8, .6, .55)); }
      }
      if (T < 5.5) { // the convoy roars past a lone marker post
        camera.up.set(0, 1, 0); camera.position.set(CX + 9, 1.8, 250);
        const look = trucks[0].position.clone(); look.y = 2; if (T > 3.6) look.lerp(new THREE.Vector3(CX, 6, 40), Math.min(1, (T - 3.6) / 1.6)); camera.lookAt(look);
      } else if (T < 10.5) { // Daniel, under the tarp, looking out over the cab
        const tr = trucks[2].position;
        camera.position.set(tr.x - .4, 2.25 + Math.sin(T * 11) * .05, tr.z + 1.4); camera.lookAt(CX, 7 - (T - 5.5) * .3, 40);
        cap.classList.remove('show');
      }
      at(4.8, 'engine', () => sfx.rumble(.35));
      at(10.5, 'black', () => { fade.style.transition = 'opacity .5s'; fade.style.opacity = 1; trucks.forEach(t => t.visible = false); });
      at(11.6, 'yard', () => {
        fade.style.transition = 'opacity 1.6s'; fade.style.opacity = 0; cap.textContent = 'SALTCROWN · THE MOTOR YARD'; cap.classList.add('show');
        sfx.toll();
      });
      if (T >= 11.6) {
        camera.up.set(0, 1, 0); camera.position.set(P.x + Math.sin(T * .3) * .2, 1.6, P.z); camera.lookAt(P.x - Math.sin(P.yaw) * 10, 3 + Math.min(1, (T - 11.6) / 3) * 2, P.z - Math.cos(P.yaw) * 10);
        if (T > 15) cap.classList.remove('show');
        if (said && Comms.idle() && !waiting) { waiting = true; wake.textContent = 'Click to climb out'; wake.classList.remove('hidden'); }
      }
    },
  };
}
