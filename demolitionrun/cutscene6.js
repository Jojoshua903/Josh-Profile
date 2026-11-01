import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { S, ROWS, COLS, sfx } from './core.js';
import { puff } from './effects.js';
import { Comms } from './comms.js';
import { buildTruck } from './cutscene4.js';

const $ = id => document.getElementById(id);
const CX = COLS * S / 2;
const ease = k => k * k * (3 - 2 * k);

export function createCoastCutscene({ scene, camera, L, P, ending, onDone }) {
  const truck = buildTruck(); scene.add(truck);
  const fade = $('fade'), cap = $('cineCap'), wake = $('wake'), A = L.anim;
  let T = 0, dustT = 0, said = false, waiting = false, finished = false;
  const fired = new Set(), at = (t, k, fn) => { if (T >= t && !fired.has(k)) { fired.add(k); fn(); } };

  document.body.classList.add('cinema'); $('cine').classList.remove('hidden'); wake.classList.add('hidden');
  fade.style.background = '#0d0c0a'; fade.style.transition = 'none'; fade.style.opacity = 1; requestAnimationFrame(() => { fade.style.transition = 'opacity 2s'; fade.style.opacity = 0; });
  cap.textContent = 'THE GLASS COAST · LANTERNHOLD · THE FINAL CHAPTER'; cap.classList.add('show');

  function finish() {
    if (finished) return; finished = true; scene.remove(truck); cap.classList.remove('show');
    document.body.classList.remove('cinema'); $('cine').classList.add('hidden'); fade.style.transition = 'opacity .4s'; fade.style.opacity = 0; Comms.clear(); onDone();
  }

  return {
    get waiting() { return waiting; },
    click() { if (waiting) { wake.classList.add('hidden'); finish(); } else Comms.advance(); },
    skip: finish,
    update(dt) {
      if (finished) return;
      T += dt;
      if (A.beam) A.beam.rotation.y = T * .5;
      if (!said && T > .8) {
        said = true;
        [...(ending === 'Z' ? [['SAND', '...the sea, king... we were the sea before we were the sand...', 3.6]] : []),
         ['MIRA_TRUE', 'The Glass Coast. A thousand years ago the last miners of Ulm-Saphar ran here, with the song chasing them. They set the beach on fire to stop it following.'],
         ['DANIEL', 'Did it work?'],
         ['MIRA_TRUE', 'For a thousand years. Then you broke the First Note, and something out there noticed it had stopped.'],
         ['DEEP', '...first... was not... first...', 3.6],
         ['MIRA_TRUE', "The First Note wasn't the first song. It was a reply. The Choir started out there, in the deep. It has been singing at the land ever since, waiting for an answer."],
         ['MIRA_TRUE', "The Watch built Lanternhold to guard this coast. Then the last of them heard the sea, and walked into it. The lighthouse still sweeps. If its light touches you, the sea knows where you are."],
         ['MIRA_TRUE', 'Three tide organs on the beach. The sea sings up through them. Break them and the sluice gate to the waterline opens.'],
         ['DANIEL', 'And then?'], ['MIRA_TRUE', "Then it's you, me and the oldest thing in the world. Last job, Daniel."],
         ['DANIEL', "It's always the last job."]].forEach(([w, t, d]) => Comms.say(w, t, d));
      }
      if (T < 6.5) { // the truck runs the coast road north at dusk, the sea on its right
        const z = ROWS * S + 60 - T * 7; truck.position.set(CX - 20 + Math.sin(T * .4) * 1.5, Math.sin(T * 9) * .03, z); truck.rotation.y = Math.sin(T * .4) * .06;
        dustT -= dt; if (dustT <= 0) { dustT = .1; puff(new THREE.Vector3(truck.position.x, .5, truck.position.z + 3), 1, 2, 0xe3d6ba, .6, .5); }
        camera.up.set(0, 1, 0); camera.position.set(CX - 8, 2, z - 14 + T * .6); camera.lookAt(truck.position.x, 1.8, truck.position.z);
      } else if (T < 14) { // crane up past the lighthouse and out over the singing water
        truck.visible = false; cap.classList.remove('show');
        const k = ease(Math.min(1, (T - 6.5) / 7.5));
        camera.position.set(CX + 30 - k * 30, 10 + k * 18, ROWS * S + 10 - k * 40); camera.lookAt(CX, 4 + k * 6, -40 * k);
      }
      at(7, 'chime', () => { sfx.chime(330); setTimeout(() => sfx.chime(247), 600); });
      at(10, 'toll', () => sfx.toll());
      at(14, 'black', () => { fade.style.transition = 'opacity .5s'; fade.style.opacity = 1; });
      at(14.8, 'gate', () => { fade.style.transition = 'opacity 1.4s'; fade.style.opacity = 0; cap.textContent = 'LANTERNHOLD · THE LANDWARD YARD'; cap.classList.add('show'); });
      if (T >= 14.8) {
        camera.up.set(0, 1, 0); camera.position.set(P.x, 1.6, P.z); camera.lookAt(P.x - Math.sin(P.yaw) * 10, 3, P.z - Math.cos(P.yaw) * 10);
        if (T > 18) cap.classList.remove('show');
        if (said && Comms.idle() && !waiting) { waiting = true; wake.textContent = 'Click to begin the last job'; wake.classList.remove('hidden'); }
      }
    },
  };
}
