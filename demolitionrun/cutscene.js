import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { S, WH, sfx } from './core.js';
import { HOLE, revealCrash } from './decor.js';
import { fireball, puff, tracer } from './effects.js';
import { Comms } from './comms.js';

const $ = id => document.getElementById(id);
const ease = k => k * k * (3 - 2 * k);

function buildChopper() {
  const g = new THREE.Group(), L = o => new THREE.MeshLambertMaterial(o);
  const body = L({ color: 0x5b5f3a }), dark = L({ color: 0x2b2a27 }), glass = L({ color: 0x9fc3cf, transparent: true, opacity: .8 });
  const B = (w, h, d, m, x, y, z, p = g) => { const k = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); k.position.set(x, y, z); k.castShadow = true; p.add(k); return k; };
  B(2.4, 2, 5, body, 0, 0, 0); B(2.2, 1.4, 1.4, glass, 0, .2, 2.8); B(.6, .6, 5.5, body, 0, .5, -5); B(.15, 1.6, 1.2, body, 0, 1.2, -7.4);
  B(2.6, .3, .3, L({ color: 0xd2391b }), 0, -.2, 1.2);
  for (const x of [-1.2, 1.2]) { B(.12, .12, 5, dark, x, -1.4, .2); B(.1, .5, .1, dark, x, -1.1, 1.5); B(.1, .5, .1, dark, x, -1.1, -1); }
  const rotor = new THREE.Group(); rotor.position.y = 1.3; g.add(rotor); B(13, .06, .4, dark, 0, 0, 0, rotor); B(.4, .06, 13, dark, 0, 0, 0, rotor); B(.4, .4, .4, dark, 0, -.2, 0, rotor);
  const tail = new THREE.Group(); tail.position.set(.15, 1.2, -7.4); g.add(tail); B(.05, 2.4, .25, dark, 0, 0, 0, tail);
  g.userData = { rotor, tail };
  return g;
}

export function createCutscene({ scene, camera, L, P, onDone }) {
  const chop = buildChopper(); scene.add(chop);
  const hx = HOLE[0] * S + S / 2, hz = HOLE[1] * S + S / 2;
  const flight = new THREE.CatmullRomCurve3([new THREE.Vector3(330, 48, 300), new THREE.Vector3(210, 38, 190), new THREE.Vector3(140, 30, 120), new THREE.Vector3(84, 26, 72)]);
  const hitPos = flight.getPoint(1);
  const crashCtl = new THREE.Vector3(50, 34, 30), crashEnd = new THREE.Vector3(hx, WH + .8, hz);
  const launch = new THREE.Vector3(58, WH + 1.2, 34);
  const rocket = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, .9, 8), new THREE.MeshBasicMaterial({ color: 0xf7f0e1 })); rocket.visible = false; scene.add(rocket);
  const fade = $('fade'), cap = $('cineCap'), wake = $('wake');
  const lieQ = new THREE.Quaternion(), standQ = new THREE.Quaternion();
  const lieP = new THREE.Vector3(P.x + .7, .45, P.z + .5);
  let T = 0, smokeT = 0, hit = false, crashed = false, introSaid = false, wakeSaid = false, waiting = false, stand = -1, finished = false;
  const fired = new Set(); const at = (t, key, fn) => { if (T >= t && !fired.has(key)) { fired.add(key); fn(); } };

  document.body.classList.add('cinema'); $('cine').classList.remove('hidden'); wake.classList.add('hidden');
  sfx.chopper(true);

  function cleanup() { scene.remove(chop); scene.remove(rocket); sfx.chopper(false); cap.classList.remove('show'); }
  function finish() {
    if (finished) return; finished = true; cleanup(); revealCrash(L.anim);
    document.body.classList.remove('cinema'); $('cine').classList.add('hidden'); fade.style.opacity = 0; Comms.clear(); onDone();
  }
  function chopperAt(t) {
    if (t <= 9.4) { const u = t / 9.4, p = flight.getPoint(u), n = flight.getPoint(Math.min(1, u + .01)); chop.position.copy(p); chop.lookAt(n.x, p.y, n.z); }
    else {
      const k = Math.min(1, (t - 9.4) / 4), a = hitPos, b = crashCtl, c = crashEnd;
      chop.position.set((1 - k) ** 2 * a.x + 2 * (1 - k) * k * b.x + k * k * c.x, (1 - k) ** 2 * a.y + 2 * (1 - k) * k * b.y + k * k * c.y, (1 - k) ** 2 * a.z + 2 * (1 - k) * k * b.z + k * k * c.z);
      chop.rotation.set(-.25 * k, chop.rotation.y + .16 + k * .1, .35 * Math.sin(t * 3));
    }
    chop.userData.rotor.rotation.y += .9; chop.userData.tail.rotation.x += .7;
  }

  return {
    get waiting() { return waiting; },
    click() { if (waiting && stand < 0) { stand = 0; wake.classList.add('hidden'); } else Comms.advance(); },
    skip: finish,
    update(dt) {
      if (finished) return;
      T += dt;
      if (!introSaid && T > .8) {
        introSaid = true;
        Comms.say('RESHMAN', "Daniel. Reshman here, your handler for tonight. Think of me as a friendly voice in your ear.", 4);
        Comms.say('DANIEL', 'Command said you were some kind of contractor.', 2.4);
        Comms.say('RESHMAN', "Relax. Their air defence is offline.", 1.6);
        Comms.say('RESHMAN', '...Okay. Not offline.', 1.5);
        Comms.say('DANIEL', "Mayday! We're going down!", 1.9);
      }
      at(.4, 'cap1', () => { cap.textContent = 'IRONVEIL COMPOUND · SOUTHERN DESERT · 14:20'; cap.classList.add('show'); });
      at(5.6, 'cap1off', () => cap.classList.remove('show'));

      if (T < 13.4) {
        chopperAt(T);
        if (T < 6) { // establishing: ground observer near the west wall
          camera.position.set(-26, 16 + T * .6, 118); const look = new THREE.Vector3(48, 4, 42).lerp(chop.position, .55); camera.lookAt(look);
        } else if (T < 9.4) { // chase cam
          const back = new THREE.Vector3(0, 0, -1).applyQuaternion(chop.quaternion);
          camera.position.copy(chop.position).addScaledVector(back, 15).add(new THREE.Vector3(0, 4.5, 0));
          camera.lookAt(chop.position.clone().addScaledVector(back, -25).setY(chop.position.y - 6));
        } else { // crash watched from the north roofline
          camera.position.set(-10, 20, -16); camera.lookAt(chop.position);
        }
        at(8.3, 'launch', () => { rocket.visible = true; sfx.whiz(); });
        if (T > 8.3 && T < 9.4) { const k = (T - 8.3) / 1.1; rocket.position.lerpVectors(launch, hitPos, k); rocket.lookAt(hitPos); rocket.rotateX(Math.PI / 2); smokeT -= dt; if (smokeT <= 0) { smokeT = .03; puff(rocket.position.clone(), .5, 1.5, 0xd8d0c0, .2, .6); } }
        at(9.4, 'hit', () => { hit = true; rocket.visible = false; fireball(hitPos.clone(), 1.4); sfx.boom(.9); });
        if (hit) { smokeT -= dt; if (smokeT <= 0) { smokeT = .04; const tailP = new THREE.Vector3(0, .5, -4).applyMatrix4(chop.matrixWorld); puff(tailP, 1, 2.5, 0x4a443c, .5, .7); } }
        // tracer fire from the roof during approach
        if (T > 6.4 && T < 9.2 && Math.random() < .25) tracer(new THREE.Vector3(40 + Math.random() * 30, WH + 1, 30 + Math.random() * 30), chop.position.clone().add(new THREE.Vector3((Math.random() - .5) * 8, (Math.random() - .5) * 4, (Math.random() - .5) * 8)), 0xffb347);
      }
      at(13.4, 'impact', () => {
        crashed = true; chop.visible = false; sfx.chopper(false); fireball(crashEnd.clone().setY(WH + 1), 3); sfx.boom(1); revealCrash(L.anim);
        Comms.clear(); fade.style.transition = 'opacity .12s'; fade.style.opacity = 1; setTimeout(sfx.ring, 200);
      });
      at(14.4, 'cap2', () => { cap.textContent = 'STORAGE BAY 1 · TWO MINUTES LATER'; cap.classList.add('show'); });
      at(16.6, 'wake', () => {
        cap.classList.remove('show'); fade.style.transition = 'opacity 2.4s'; fade.style.opacity = 0;
        camera.position.copy(lieP); camera.up.set(0, 1, 0); camera.lookAt(hx, WH + 6, hz); camera.rotateZ(.35); lieQ.copy(camera.quaternion);
      });
      if (T > 16.6 && stand < 0) { // groggy sway while lying on the floor
        camera.position.copy(lieP); camera.quaternion.copy(lieQ); camera.rotateZ(Math.sin(T * .8) * .04); camera.rotateX(Math.sin(T * .6) * .03);
        if (!wakeSaid && T > 17.6) {
          wakeSaid = true;
          [['RESHMAN', 'Daniel. Daniel! Tell me you landed on something soft.'], ['DANIEL', 'A roof. Then a floor. Then more floor.'], ['RESHMAN', 'And the pilot?'], ['DANIEL', "...He didn't make it."],
           ['RESHMAN', "Then it's you, me and a backpack full of C4. The Watch sealed the gate the second you came through their ceiling."],
           ['RESHMAN', 'Comms Array, Fuel Depot, Generator. Rig all three and their lockdown fails. The south gate opens. You walk out.'],
           ['DANIEL', 'Who are you really working for, Reshman?'], ['RESHMAN', 'A friend. Mostly. Now get up, before someone comes to see what fell through their roof.']].forEach(([w, t]) => Comms.say(w, t));
        }
        if (wakeSaid && Comms.idle() && !waiting) { waiting = true; wake.classList.remove('hidden'); }
      }
      if (stand >= 0) {
        stand += dt / 1.2; const k = ease(Math.min(1, stand));
        standQ.setFromEuler(new THREE.Euler(0, P.yaw, 0, 'YXZ'));
        camera.position.lerpVectors(lieP, new THREE.Vector3(P.x, 1.6, P.z), k); camera.quaternion.copy(lieQ).slerp(standQ, k);
        if (stand >= 1) finish();
      }
    },
  };
}
