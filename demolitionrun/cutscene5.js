import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { S, ROWS, COLS, WH, sfx } from './core.js';
import { puff } from './effects.js';
import { Comms } from './comms.js';
import { buildTruck } from './cutscene4.js';

const $ = id => document.getElementById(id);
const CX = COLS * S / 2, CZ = ROWS * S / 2;
const ease = k => k * k * (3 - 2 * k);

export function createCanyonCutscene({ scene, camera, L, P, ending, onDone }) {
  const truck = buildTruck(); scene.add(truck);
  const fade = $('fade'), cap = $('cineCap'), wake = $('wake');
  let T = 0, dustT = 0, smokeT = 0, said = false, waiting = false, finished = false;
  const fired = new Set(), at = (t, k, fn) => { if (T >= t && !fired.has(k)) { fired.add(k); fn(); } };

  document.body.classList.add('cinema'); $('cine').classList.remove('hidden'); wake.classList.add('hidden');
  fade.style.background = '#0d0c0a'; fade.style.transition = 'none'; fade.style.opacity = 1; requestAnimationFrame(() => { fade.style.transition = 'opacity 1.8s'; fade.style.opacity = 0; });
  cap.textContent = 'SARRAT · THE RED CANYON · THE ORDER OF QUIET SAND'; cap.classList.add('show');

  function finish() {
    if (finished) return; finished = true; scene.remove(truck); cap.classList.remove('show');
    document.body.classList.remove('cinema'); $('cine').classList.add('hidden'); fade.style.transition = 'opacity .4s'; fade.style.opacity = 0; Comms.clear(); onDone();
  }
  // smoke columns over the monastery: it is already under attack
  const fires = [[5 * S, 5 * S], [20 * S, 9 * S], [12 * S, 15 * S]];

  return {
    get waiting() { return waiting; },
    click() { if (waiting) { wake.classList.add('hidden'); finish(); } else Comms.advance(); },
    skip: finish,
    update(dt) {
      if (finished) return;
      T += dt;
      if (!said && T > .8) {
        said = true;
        [['MIRA', "Welcome to Sarrat. Nobody outside the Order has seen it in four hundred years."],
         ['DANIEL', 'Is it supposed to be on fire?'], ['MIRA', '...No.'],
         ...(ending === 'Z' ? [['SAND', '...the quiet ones, king... they keep cages here... cages for kings...', 3.6]] : []),
         ['MIRA', "The Choirguard who walked out of Saltcrown. They call themselves the Unending now. And they brought something with them."],
         ['MIRA', "Ashe's arm. It kept singing after she died. It's been eating the bell's shards. It's big now, Daniel."],
         ['ABBESS', 'Fire-bringer. I am Abbess Tenet. My monks have sealed themselves in the sanctum. We do not fight. We are very bad at it.'],
         ['ABBESS', 'Three wind dams hold back the canyon sand. Break them and the passes fill. No more of them can come in.'],
         ['DANIEL', 'And the ones already inside?'], ['ABBESS', 'Those, I am told, are your speciality.'],
         ['MIRA', "Storms roll through the canyon every half minute or so. In a storm they can't see past their own noses. Use it."]].forEach(([w, t, d]) => Comms.say(w, t, d));
      }
      smokeT -= dt; if (smokeT <= 0) { smokeT = .15; for (const [x, z] of fires) puff(new THREE.Vector3(x + (Math.random() - .5) * 3, WH + 2, z + (Math.random() - .5) * 3), 4, 6, 0x8c7466, 5, .5); }
      if (T < 6) { // the truck threads the canyon toward the monastery
        const z = ROWS * S + 34 - T * 4.5; truck.position.set(CX + Math.sin(T * .6) * 2, 0, z); truck.rotation.y = Math.sin(T * .6) * .1;
        dustT -= dt; if (dustT <= 0) { dustT = .09; puff(new THREE.Vector3(truck.position.x, .5, truck.position.z + 3), 1.1, 2, 0xe6b98e, .6, .55); }
        camera.up.set(0, 1, 0); camera.position.set(CX + 7, 2.2, z + 12 - T * .5); camera.lookAt(truck.position.x, 2.5, truck.position.z - 20);
      } else if (T < 13) { // crane up over the walls: wind towers, flags, smoke
        truck.visible = false; cap.classList.remove('show');
        const k = ease(Math.min(1, (T - 6) / 7));
        camera.position.set(CX - 30 + k * 40, 8 + k * 30, ROWS * S + 20 - k * 40); camera.lookAt(CX, 2, CZ - 6);
      }
      at(6.4, 'gong', () => sfx.bell(130));
      at(13, 'black', () => { fade.style.transition = 'opacity .5s'; fade.style.opacity = 1; });
      at(13.8, 'gate', () => { fade.style.transition = 'opacity 1.4s'; fade.style.opacity = 0; cap.textContent = 'SARRAT · THE SOUTH HALL'; cap.classList.add('show'); });
      if (T >= 13.8) {
        camera.up.set(0, 1, 0); camera.position.set(P.x, 1.6, P.z); camera.lookAt(P.x - Math.sin(P.yaw) * 10, 2.4, P.z - Math.cos(P.yaw) * 10);
        if (T > 17) cap.classList.remove('show');
        if (said && Comms.idle() && !waiting) { waiting = true; wake.textContent = 'Click to begin'; wake.classList.remove('hidden'); }
      }
    },
  };
}
