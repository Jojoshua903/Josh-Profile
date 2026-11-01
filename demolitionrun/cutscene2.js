import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { WH, sfx, makeTex, grain } from './core.js';
import { puff } from './effects.js';
import { Comms } from './comms.js';

const $ = id => document.getElementById(id);
const ease = k => k * k * (3 - 2 * k);
const OX = 2000; // the desert set is built far away from the vault

export function makeDaniel(ghost = false) {
  const g = new THREE.Group();
  const M = c => ghost ? new THREE.MeshBasicMaterial({ color: 0xbff4f0, transparent: true, opacity: .35, depthWrite: false }) : new THREE.MeshLambertMaterial({ color: c });
  const B = (w, h, d, c, x, y, z, p = g) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); m.position.set(x, y, z); m.castShadow = !ghost; p.add(m); return m; };
  const legL = new THREE.Group(), legR = new THREE.Group(); legL.position.set(-.16, .8, 0); legR.position.set(.16, .8, 0); g.add(legL, legR);
  B(.25, .8, .28, 0x3f4232, 0, -.4, 0, legL); B(.25, .8, .28, 0x3f4232, 0, -.4, 0, legR);
  B(.7, .78, .42, 0x5b5f3a, 0, 1.18, 0); B(.74, .5, .46, 0x2b2a27, 0, 1.25, 0); B(.6, .7, .3, 0x6f7348, 0, 1.2, -.36);
  B(.36, .36, .36, 0xc99a6e, 0, 1.76, 0); B(.44, .16, .44, 0x5b5f3a, 0, 1.96, 0); B(.38, .08, .04, 0xf2b51c, 0, 1.82, .19);
  B(.18, .6, .2, 0x5b5f3a, -.45, 1.15, 0); B(.18, .6, .2, 0x5b5f3a, .45, 1.15, 0);
  g.userData = { legL, legR };
  return g;
}

export function createVaultCutscene({ scene, camera, L, P, bg, onDone }) {
  const set = new THREE.Group(); scene.add(set);
  const sandTex = makeTex((g, w, h) => grain(g, w, h, '#e0c896', .08, 8000), 256, 256, 80, 80);
  const desert = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), new THREE.MeshLambertMaterial({ map: sandTex })); desert.rotation.x = -Math.PI / 2; desert.position.set(OX, 0, 0); set.add(desert);
  for (let i = 0; i < 14; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(20 + Math.random() * 30, 16, 8), new THREE.MeshLambertMaterial({ color: 0xdcc08a })); d.scale.y = .12; d.position.set(OX + (Math.random() - .5) * 300, -1, -60 - Math.random() * 120 + (i % 2) * 200); set.add(d); }
  const glow = new THREE.Mesh(new THREE.SphereGeometry(18, 16, 8), new THREE.MeshBasicMaterial({ color: 0xff8a3a, fog: false })); glow.scale.y = .4; glow.position.set(OX + 10, 0, 170); set.add(glow);
  const dan = makeDaniel(); set.add(dan);
  const crack = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ color: 0x2b2216 })); crack.rotation.x = -Math.PI / 2; crack.scale.setScalar(.01); set.add(crack);
  const fade = $('fade'), cap = $('cineCap'), wake = $('wake');
  const sx = L.start.x, sz = L.start.z;
  const lieP = new THREE.Vector3(sx + .6, .45, sz + .4), lieQ = new THREE.Quaternion(), standQ = new THREE.Quaternion();
  let T = 0, smokeT = 0, shake = 0, wakeSaid = false, waiting = false, stand = -1, finished = false;
  const fired = new Set(); const at = (t, key, fn) => { if (T >= t && !fired.has(key)) { fired.add(key); fn(); } };
  const danZ = t => 6 - t * 1.5; // Daniel walks north (−z)

  document.body.classList.add('cinema'); $('cine').classList.remove('hidden'); wake.classList.add('hidden');
  scene.background.setHex(0xf1e4c8);
  fade.style.transition = 'none'; fade.style.opacity = 1; requestAnimationFrame(() => { fade.style.transition = 'opacity 1.6s'; fade.style.opacity = 0; });

  function finish() {
    if (finished) return; finished = true; scene.remove(set); scene.background.setHex(bg); cap.classList.remove('show');
    document.body.classList.remove('cinema'); $('cine').classList.add('hidden'); fade.style.background = '#0d0c0a'; fade.style.transition = 'opacity .4s'; fade.style.opacity = 0; Comms.clear(); onDone();
  }

  return {
    get waiting() { return waiting; },
    click() { if (waiting && stand < 0) { stand = 0; wake.classList.add('hidden'); } else Comms.advance(); },
    skip: finish,
    update(dt) {
      if (finished) return;
      T += dt;
      at(.3, 'cap1', () => { cap.textContent = 'THE DESERT · TWENTY MINUTES AFTER IRONVEIL'; cap.classList.add('show'); });
      at(5, 'cap1off', () => cap.classList.remove('show'));
      at(.8, 'talk1', () => {
        Comms.say('RESHMAN', "Ironveil's gone. You can see that smoke from orbit. Nice work.", 3.2);
        Comms.say('DANIEL', 'Now tell me about this client.', 2);
        Comms.say('RESHMAN', 'What client? Keep walking north. Pickup is two kilometres out.', 3);
        Comms.say('RESHMAN', 'Daniel. Stop walking.', 1.5);
      });
      if (T < 12) { // the burning base on the horizon
        smokeT -= dt; if (smokeT <= 0) { smokeT = .12; puff(new THREE.Vector3(OX + (Math.random() - .5) * 20, 4 + Math.random() * 6, 170 + (Math.random() - .5) * 10), 14, 7, 0x8c8274, 9, .55); }
        dan.position.set(OX, 0, danZ(Math.min(T, 10.6))); const sw = T < 10.6 ? Math.sin(T * 6) * .5 : 0; dan.userData.legL.rotation.x = sw; dan.userData.legR.rotation.x = -sw; dan.rotation.y = Math.PI;
      }
      at(8.8, 'rumble', () => { sfx.rumble(.8); shake = .25; });
      at(10.6, 'crack', () => { sfx.rumble(1); shake = .5; crack.position.set(OX, .03, danZ(10.6)); });
      if (T > 10.6 && T < 12) crack.scale.setScalar(Math.min(6, (T - 10.6) * 9));
      shake *= Math.pow(.3, dt);
      const jig = () => new THREE.Vector3((Math.random() - .5) * shake, (Math.random() - .5) * shake, (Math.random() - .5) * shake);
      if (T < 6) { // facing Daniel, smoke behind him
        camera.position.set(OX + 2.2, 1.3, danZ(T) - 7 + T * .3); camera.lookAt(OX, 1.5, danZ(T) + 4);
      } else if (T < 12) { // his eyes, walking, then the ground goes
        const z = danZ(Math.min(T, 10.6)), fall = T > 11.1 ? (T - 11.1) ** 2 * 30 : 0;
        camera.position.set(OX, 1.6 + Math.sin(T * 12) * .04 - fall, z - .2).add(jig());
        camera.lookAt(OX, 1.5 - (T > 10.6 ? (T - 10.6) * 4 : 0) - fall, z - 10);
        dan.visible = false;
      }
      at(11.5, 'white', () => { Comms.clear(); fade.style.background = '#fbf6ea'; fade.style.transition = 'opacity .3s'; fade.style.opacity = 1; sfx.whisper(); });
      at(12.6, 'vault', () => {
        scene.background.setHex(bg); fade.style.transition = 'opacity 2.5s'; fade.style.opacity = 0;
        cap.textContent = 'UNDER THE DESERT · DEPTH UNKNOWN'; cap.classList.add('show');
        Comms.say('VAULT', '...small fire... you came back to us...', 3.6);
      });
      if (T >= 12.6 && T < 19.5) { // a fall far too slow to be natural
        const k = ease(Math.min(1, (T - 12.6) / 6.9));
        camera.position.set(sx + Math.sin(T * .4) * 1.5 * (1 - k), 48 - 47.5 * k, sz + Math.cos(T * .4) * 1.5 * (1 - k));
        camera.up.set(0, 1, 0); camera.lookAt(sx + Math.sin(T) * 6 * (1 - k) + 6, camera.position.y - 14 + k * 12, sz + 4); camera.rotateZ(T * .25 * (1 - k));
      }
      at(17, 'capoff', () => cap.classList.remove('show'));
      at(19.5, 'land', () => { camera.position.copy(lieP); camera.up.set(0, 1, 0); camera.lookAt(sx, 30, sz - 2); camera.rotateZ(-.3); lieQ.copy(camera.quaternion); });
      if (T >= 19.5 && stand < 0) {
        camera.position.copy(lieP); camera.quaternion.copy(lieQ); camera.rotateZ(Math.sin(T * .7) * .05);
        if (!wakeSaid && T > 20.2) {
          wakeSaid = true; fade.style.background = '#0d0c0a';
          [['DANIEL', 'I just fell a hundred metres.'], ['DANIEL', '...So why am I not dead?'],
           ['RESH_GLITCH', "Dan-iel? Your signal's... wrong. Where are you?"],
           ['DANIEL', 'Under the desert. Cave full of floating rocks. Something down here just said my name.'],
           ['RESH_GLITCH', "Okay. Don't panic. I'm reading three huge resonance sources around you. Stones. Old ones."],
           ['RESHMAN', "They're holding a door shut. Break all three and the door opens. That's your way out."],
           ['DANIEL', 'And you know this how?'], ['RESH_GLITCH', 'Lucky guess. Get up.']].forEach(([w, t]) => Comms.say(w, t));
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
