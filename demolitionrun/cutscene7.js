import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { S, ROWS, COLS, sfx } from './core.js';
import { Comms } from './comms.js';

const $ = id => document.getElementById(id);
const CX = COLS * S / 2, CZ = ROWS * S / 2;
const ease = k => k * k * (3 - 2 * k);

// Bonus: Sarrat at night, a thousand and four years ago, the evening before the Order chose its blade
export function createTrialCutscene({ camera, P, onDone }) {
  const fade = $('fade'), cap = $('cineCap'), wake = $('wake');
  let T = 0, said = false, waiting = false, finished = false;
  const fired = new Set(), at = (t, k, fn) => { if (T >= t && !fired.has(k)) { fired.add(k); fn(); } };

  document.body.classList.add('cinema'); $('cine').classList.remove('hidden'); wake.classList.add('hidden');
  fade.style.background = '#0d0c0a'; fade.style.transition = 'none'; fade.style.opacity = 1; requestAnimationFrame(() => { fade.style.transition = 'opacity 2s'; fade.style.opacity = 0; });
  cap.textContent = 'SARRAT · 1,004 YEARS AGO · THE NIGHT BEFORE'; cap.classList.add('show');

  function finish() {
    if (finished) return; finished = true; cap.classList.remove('show');
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
        [['ELDER', 'Reshman. Wake up. It is the middle of the night, which is the point.'],
         ['YOUNG_RESH', 'Master Ilka? Is it the trial?'],
         ['ELDER', 'It is. A letter came from the north. Something in Ulm-Saphar has started to sing. The Order will send one of you to listen.'],
         ['YOUNG_RESH', "Just one?"], ['ELDER', 'Always one. Three bells, three charms, and back to me. Nobody sees you. Not your brothers, not me.'],
         ['YOUNG_RESH', "And if I'm seen?"], ['ELDER', 'Then someone else goes north. And you go home to your mother for the festival. That would not be the worst thing.']]
          .forEach(([w, t, d]) => Comms.say(w, t, d));
      }
      if (T < 9) { // drift over the monastery under the stars, before the canyon ever burned
        const k = ease(Math.min(1, T / 9));
        camera.up.set(0, 1, 0); camera.position.set(CX + 40 - k * 40, 34 - k * 14, CZ + 40 - k * 20); camera.lookAt(CX, 2, CZ - 10 + k * 6);
      }
      at(2, 'gong', () => sfx.bell(110));
      at(9, 'black', () => { fade.style.transition = 'opacity .6s'; fade.style.opacity = 1; });
      at(9.9, 'cell', () => { fade.style.transition = 'opacity 1.4s'; fade.style.opacity = 0; cap.textContent = 'THE NOVICES’ HALL'; cap.classList.add('show'); });
      if (T >= 9.9) {
        cap.classList.toggle('show', T < 13);
        camera.up.set(0, 1, 0); camera.position.set(P.x, 1.6, P.z); camera.lookAt(P.x - Math.sin(P.yaw) * 10, 2.4, P.z - Math.cos(P.yaw) * 10);
        if (said && Comms.idle() && !waiting) { waiting = true; wake.textContent = 'Click to begin the trial'; wake.classList.remove('hidden'); }
      }
    },
  };
}
