// ==========================================================
// cutscene.js — in-engine cutscenes: the camera leaves the hero,
// letterbox bars slide in, characters talk in speech boxes, and
// title cards fade over the scene. Every scene can be skipped.
//
// A scene is a list of steps run one after another:
//   { cam: { pos, look }, dur, ease }   camera glide (runs in the background)
//   { cut: { pos, look } }               instant camera cut
//   { say: speaker, text }               speech box; waits for ENTER / A
//   { title, sub, dur, hold }            title card (hold = wait for it)
//   { wait: seconds }
//   { fade: 0|1, dur }                   black fade
//   { walk: Vector3, maxT, speed }       hero walks there (real movement)
//   { face: angle, dur }                 hero turns
//   { tween: dur, fn(k, dt), end() }     custom animation
//   { do: fn }                           one-off action (also runs on skip)
// ==========================================================
import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { CONFIG } from './config.js';
import { drawPortrait } from './graphics/textures.js';
import { buildGhost, buildHero, buildKey } from './graphics/models.js';
import { ROOM_DEFS, LEVEL_NAMES } from './world/MansionBuilder.js';
import { PROFESSOR } from './characters.js';

const $ = (id) => document.getElementById(id);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const smooth = (k) => k * k * (3 - 2 * k);
const easeOut = (k) => 1 - (1 - k) * (1 - k);

// dialogue voice pitch per hero
const VOICE = { nathan: 1, josh: 1.1, milo: 1.25, reshman: 0.7, lars: 0.8, daniel: 0.95, koc: 0.8, fionn: 1.05, renas: 1.3 };

// what each hero says walking in, and when the call for help comes through
const ARRIVAL = {
  nathan: ['...Hello? Huh. The door locked itself behind me. Classic.', 'Hang tight, {t}. Batter up!'],
  josh: ['My visor is picking up readings. A lot of readings. Like, a LOT.', 'Locking onto your signal, {t}. I\'ll find you.'],
  milo: ['My hat is sparking all by itself. That is... never a good sign.', 'Hold on, {t}! I\'ll zap my way through every ghost in here!'],
  reshman: ['( Reshman\'s eyes go very wide, then blink twice. )', '( Reshman nods. The shadows in the corners nod with him. )'],
  lars: ['Kayo! Yara! Stay close now. This place smells worse than a flooded mine.', 'Don\'t you worry, {t}. We\'ll dig you out!'],
  daniel: ['Nice place. Shame if somebody were to... light it up.', 'Sit tight, {t}. I\'m coming in loud!'],
  fionn: ['Old stone, older ghosts. Fascinating... and absolutely terrifying.', 'With a bit of luck, {t}, you\'ll be out by supper!'],
  renas: ['Okay, gadgets. Please don\'t fail me now.', 'Hold on, {t}! I built a gizmo for exactly this. Probably.'],
};
const RESCUE = {
  nathan: 'Home run! Let\'s go home, {t}.',
  josh: 'Signal found, teammate recovered. Let\'s go home.',
  milo: 'That was electrifying! Let\'s get out of here.',
  reshman: '( Reshman gives a tiny, very proud thumbs-up. )',
  lars: 'Kayo and Yara missed you, {t}! Let\'s head home.',
  daniel: 'Told you I\'d come in loud. Let\'s bounce.',
  fionn: 'The luck of the Irish! Let\'s get you home, {t}.',
  renas: 'The gizmo worked! Mostly. Let\'s go!',
};
// subtitle on the title card when a key opens a door
const DOOR_FLAVOR = {
  dining: 'Something is chewing in the dark...',
  westhall: 'The West Wing',
  library: 'Shhh... the books are whispering.',
  conservatory: 'Piano music drifts between the plants.',
  nursery: 'A music box is playing by itself.',
  observatory: 'The stars are watching.',
  bedroom: 'Zzzz... tiptoe.',
  easthall: 'The East Wing',
  storage: 'Boxes. Dust. Something breathing.',
  boiler: 'It\'s getting hot down here.',
  kitchen: 'Something smells... burnt.',
  ballroom: 'The final dance awaits.',
};

export class CutsceneDirector {
  constructor(game) {
    this.game = game;
    this.el = {
      root: $('cutscene'), title: $('cs-title'), titleMain: $('cs-title-main'), titleSub: $('cs-title-sub'),
      box: $('cs-box'), portrait: $('cs-portrait'), name: $('cs-name'), text: $('cs-text'),
    };
    this.queue = [];
    this.active = null;
    this.camPos = new THREE.Vector3();
    this.camLook = new THREE.Vector3();
    this.camTween = null;
    this.shake = 0;
    this.holdDoor = null; // a door the scene opens itself (kept shut until then)
    this.seen = new Set();
  }

  get playing() {
    return !!this.active;
  }

  // the camera's target point; lights and wall cutaways follow it
  get focus() {
    return this.camLook;
  }

  // queue a scene; `build` runs when it starts, so positions are current
  enqueue(build, { delay = 0, onEnd = null, restore = true } = {}) {
    this.queue.push({ build, delay, onEnd, restore });
  }

  clear() {
    this.queue = [];
    if (this.active) {
      this.teardown();
      this.setFade(0);
    }
    if (this.game.viewScene) this.showExterior(false);
    this.active = null;
    this.holdDoor = null;
  }

  // called from the gameplay loop: start a queued scene once it's safe
  tryStart(dt) {
    if (this.active || !this.queue.length) return false;
    const q = this.queue[0];
    q.delay -= dt;
    const g = this.game;
    if (q.delay > 0 || !this.canStart()) return false;
    this.queue.shift();
    this.start(q);
    return true;
  }

  canStart() {
    const g = this.game;
    const p = g.player;
    return g.state === 'PLAYING' && !g.transition && p && !p.latched && p.hp > 0;
  }

  // play right now (used when the hero walks into a locked door)
  playNow(build, opts = {}) {
    if (this.active || !this.canStart()) return false;
    this.start({ build, delay: 0, onEnd: opts.onEnd || null, restore: opts.restore !== false });
    return true;
  }

  start(entry) {
    const g = this.game;
    const cam = g.camera;
    // pick up exactly where the gameplay camera is
    this.camPos.copy(cam.position);
    this.camLook.copy(g.rig.look).add(V(0, 0.6, -0.4));
    this.camTween = null;
    this.shake = 0;
    const steps = entry.build(this) || [];
    this.active = { ...entry, steps, i: -1, step: null, t: 0, skipped: false };
    g.setState('CUTSCENE');
    g.sound.setVacuum(false);
    g.sound.setTug(false);
    g.hud.show(false);
    g.hud.prompt(null);
    this.el.root.classList.remove('hidden');
    void this.el.root.offsetWidth; // let the bars animate in from zero
    this.el.root.classList.add('bars');
    this.next();
  }

  // ---------------------------------------------------------------
  next() {
    const a = this.active;
    if (!a) return;
    if (a.step && a.step.end) a.step.end();
    a.i++;
    a.t = 0;
    a.step = a.steps[a.i] || null;
    if (!a.step) {
      this.finish();
      return;
    }
    this.begin(a.step);
  }

  begin(s) {
    const g = this.game;
    if (s.do) {
      s.do(g);
      s.instant = true;
    } else if (s.cut) {
      this.camPos.copy(s.cut.pos);
      this.camLook.copy(s.cut.look);
      this.camTween = null;
      s.instant = true;
    } else if (s.cam) {
      this.camTween = {
        fromPos: this.camPos.clone(), fromLook: this.camLook.clone(),
        toPos: s.cam.pos.clone(), toLook: s.cam.look.clone(), t: 0, dur: s.dur || 1, ease: s.ease || smooth,
      };
      s.instant = !s.wait;
    } else if (s.say !== undefined) {
      this.showSay(s);
    } else if (s.title !== undefined) {
      this.el.titleMain.textContent = s.title;
      this.el.titleSub.textContent = s.sub || '';
      this.el.title.classList.add('show');
      this.titleTimer = s.dur || 2.4;
      s.instant = !s.hold;
    } else if (s.fade !== undefined) {
      s.from = this.fadeLevel || 0;
    } else if (s.walk) {
      s.start = g.player.pos.clone();
    } else if (s.face !== undefined) {
      s.from = g.player.facing;
    }
  }

  showSay(s) {
    const g = this.game;
    const who = s.say;
    const box = this.el.box;
    box.classList.add('show');
    box.classList.remove('done');
    box.classList.toggle('radio', !!who.radio);
    box.classList.toggle('narration', !!who.narrate);
    box.classList.toggle('letter', !!who.letter);
    this.el.name.innerHTML = who.narrate || who.letter ? '' : `${who.name.toUpperCase()}${who.radio ? '<small>📟 KOÇ RADAR</small>' : who.tag ? `<small>${who.tag}</small>` : ''}`;
    const c = this.el.portrait;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    if (who.portrait) drawPortrait(ctx, c.width, who.portrait);
    s.full = s.text;
    s.shown = 0;
    s.blip = 0;
    this.el.text.textContent = '';
    if (who.letter) {
      // a letter appears all at once, like a card being handed over
      this.el.text.innerHTML = s.text;
      s.shown = s.full.length;
      box.classList.add('done');
      g.sound.chestOpen();
    }
    if (who.radio) g.sound.radio();
  }

  update(dt, input) {
    const a = this.active;
    if (!a) return;
    const g = this.game;
    const advance = input.hit('Enter', 'NumpadEnter', 'Space', 'KeyE') || input.lmbPressed;
    if (input.hit('Escape')) {
      this.skip();
      return;
    }

    // title card timer runs on its own
    if (this.titleTimer > 0) {
      this.titleTimer -= dt;
      if (this.titleTimer <= 0) this.el.title.classList.remove('show');
    }

    // camera glide
    if (this.camTween) {
      const c = this.camTween;
      c.t += dt;
      const k = c.ease(Math.min(1, c.t / c.dur));
      this.camPos.lerpVectors(c.fromPos, c.toPos, k);
      this.camLook.lerpVectors(c.fromLook, c.toLook, k);
      if (c.t >= c.dur) this.camTween = null;
    }

    // the step itself
    let s = a.step;
    let walkInput = null;
    while (s && s.instant) {
      this.next();
      if (!this.active) return;
      s = this.active.step;
    }
    if (s) {
      a.t += dt;
      let done = false;
      if (s.cam) {
        done = !this.camTween;
      } else if (s.say !== undefined) {
        if (s.shown < s.full.length) {
          s.shown = Math.min(s.full.length, s.shown + dt * 46);
          this.el.text.textContent = s.full.slice(0, Math.floor(s.shown));
          s.blip -= dt;
          if (s.blip <= 0 && !s.say.narrate) {
            s.blip = 0.075;
            g.sound.talk(s.say.pitch || 1, !!s.say.radio);
          }
          if (advance) s.shown = s.full.length;
          if (s.shown >= s.full.length) {
            this.el.text.textContent = s.full;
            this.el.box.classList.add('done');
          }
        } else if (advance) {
          this.el.box.classList.remove('show');
          done = true;
        }
      } else if (s.title !== undefined) {
        done = this.titleTimer <= 0;
      } else if (s.wait !== undefined) {
        done = a.t >= s.wait;
      } else if (s.fade !== undefined) {
        const k = Math.min(1, a.t / (s.dur || 0.8));
        this.setFade(s.from + (s.fade - s.from) * k);
        done = k >= 1;
      } else if (s.walk) {
        const p = g.player.pos;
        const dx = s.walk.x - p.x;
        const dz = s.walk.z - p.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.25 || a.t > (s.maxT || 4)) done = true;
        else {
          const sp = (s.speed || 0.7) * Math.min(1, d / 1.2 + 0.25);
          walkInput = { x: (dx / d) * sp, z: (dz / d) * sp };
        }
      } else if (s.face !== undefined) {
        const k = smooth(Math.min(1, a.t / (s.dur || 0.5)));
        g.player.facing = lerpAngleRaw(s.from, s.face, k);
        done = k >= 1;
      } else if (s.tween !== undefined) {
        const k = Math.min(1, a.t / s.tween);
        if (s.fn) s.fn(k, dt);
        done = k >= 1;
      } else {
        done = true;
      }
      if (done) this.next();
    }
    this.driveHero(dt, walkInput);
  }

  // the hero keeps breathing / walking during a scene through the normal
  // player update, fed with scripted stick input
  driveHero(dt, walk) {
    const g = this.game;
    if (!g.player) return;
    const input = {
      moveX: walk ? walk.x : 0, moveZ: walk ? walk.z : 0, tankForward: 0, tankTurn: 0,
      flashHeld: false, flashPressed: false, vacuumHeld: false, vacuumDepth: 1, interact: false,
      mouseAim: false, mouseMoved: false, aimPoint: null, stickAim: null, sprayHeld: false, sprayPressed: false,
    };
    const opts = g.options;
    const ctl = opts ? opts.control : null;
    if (opts) opts.control = 'standard'; // scripted walks ignore lateral controls
    g.player.update(dt, input, g, g.time);
    if (opts) opts.control = ctl;
  }

  applyCamera(dt) {
    const cam = this.game.camera;
    this.shake = Math.max(0, this.shake - dt * 1.6);
    const s = this.shake * this.shake * CONFIG.camera.maxShake;
    const t = this.game.time * 38;
    cam.position.set(this.camPos.x + Math.sin(t * 1.1) * s, this.camPos.y + Math.sin(t * 1.7 + 1) * s * 0.6, this.camPos.z + Math.sin(t * 1.3 + 2) * s * 0.5);
    cam.lookAt(this.camLook);
  }

  addShake(a) {
    this.shake = Math.min(1, this.shake + a);
    if (this.game.input && this.game.rig.shakeScale > 0) this.game.input.rumble(0.3 * a, 0.6 * a, 200);
  }

  setFade(v) {
    this.fadeLevel = v;
    this.game.hud.setFade(v);
  }

  // jump to the end: one-off actions still happen, the rest is dropped
  skip() {
    const a = this.active;
    if (!a) return;
    a.skipped = true;
    if (a.step && a.step.end) a.step.end();
    if (a.step && a.step.walk) this.game.player.pos.set(a.step.walk.x, 0, a.step.walk.z);
    for (let i = a.i + 1; i < a.steps.length; i++) {
      const s = a.steps[i];
      if (s.do) s.do(this.game);
      if (s.walk) this.game.player.pos.set(s.walk.x, 0, s.walk.z);
      if (s.face !== undefined) this.game.player.facing = s.face;
      if (s.end) s.end();
    }
    a.step = null;
    this.finish();
  }

  teardown() {
    this.el.root.classList.remove('bars');
    this.el.box.classList.remove('show');
    this.el.title.classList.remove('show');
    this.titleTimer = 0;
    setTimeout(() => {
      if (!this.active) this.el.root.classList.add('hidden');
    }, 650);
  }

  finish() {
    const a = this.active;
    if (!a) return;
    this.active = null;
    this.holdDoor = null;
    if (this.game.viewScene) this.showExterior(false);
    this.teardown();
    const g = this.game;
    if (a.restore) {
      this.setFade(0);
      g.rig.snap(g.player.pos);
      g.rig.resetBounds();
      if (g.state === 'CUTSCENE') g.setState('PLAYING');
      g.hud.show(true);
      g.clock.getDelta();
    }
    if (a.onEnd) a.onEnd(g, a.skipped);
  }

  // where the gameplay camera will be once the scene hands back control
  rigPose() {
    const g = this.game;
    const cfg = CONFIG.camera;
    const look = g.player.pos.clone();
    const z = g.rig.zoom || 1;
    return { pos: V(look.x, look.y + cfg.height * z, look.z + cfg.distance * z), look: V(look.x, look.y + 0.6, look.z - 0.4) };
  }

  backToPlay(dur = 0.9) {
    return { cam: this.rigPose(), dur, wait: true };
  }

  // ---------------------------------------------------------------
  // SPEAKERS
  hero(char, tag = '') {
    return { name: char.name, portrait: char, pitch: VOICE[char.id] || 1, tag };
  }

  radio(char) {
    return { name: char.name, portrait: char, pitch: VOICE[char.id] || 1, radio: true };
  }

  // Professor Koç: over the radio by default, or in person (live = true)
  prof(live = false) {
    const P = PROFESSOR;
    return live
      ? { name: P.name, portrait: P, pitch: VOICE[P.id], tag: P.title.toUpperCase() }
      : { name: P.short, portrait: P, pitch: VOICE[P.id], radio: true };
  }

  narrator() {
    return { name: '', narrate: true };
  }

  letter() {
    return { name: '', letter: true };
  }

  // switch the camera to the mansion seen from outside (story shots)
  showExterior(on) {
    const g = this.game;
    const ext = on ? g.getExterior() : null;
    g.viewScene = ext ? ext.scene : null;
    g.camera.far = on ? 420 : 120;
    g.camera.updateProjectionMatrix();
  }
}

function lerpAngleRaw(a, b, k) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * k;
}

// ===================================================================
// SCENES
// ===================================================================

// A new run: the hero steps into the dark Foyer, the doors slam, something
// giggles on the stairs, and a teammate calls for help over the radio.
export function openingScene(game) {
  const char = game.char;
  const mate = game.trappedChar;
  const lines = ARRIVAL[char.id] || ARRIVAL.nathan;
  const fill = (s) => s.replace('{t}', mate.name).replace('{h}', char.name);
  let ghost = null;
  return (cs) => [
    ...prologueSteps(game, cs),
    { do: () => {
      cs.setFade(1);
      game.player.spawn(V(0, 0, 20.4), Math.PI);
    } },
    { cut: { pos: V(0, 3.4, 28.5), look: V(0, 1.8, 14) } },
    { cam: { pos: V(0, 6.2, 26.5), look: V(0, 1.2, 13) }, dur: 5 },
    { fade: 0, dur: 1.4 },
    { walk: V(0, 0, 16.6), maxT: 3.5, speed: 0.55 },
    { do: () => {
      // the front doors slam shut behind the hero
      game.sound.thud();
      game.sound.creak();
      game.fx.puff(V(0, 0.5, 21.4), 0xb8a890, 18);
      cs.addShake(0.55);
    } },
    { face: 0, dur: 0.35 },
    { wait: 0.6 },
    { face: Math.PI, dur: 0.6 },
    { say: cs.hero(char), text: fill(lines[0]) },
    { do: () => {
      ghost = buildGhost('white');
      ghost.group.position.set(-8, 3.6, 8.6);
      game.scene.add(ghost.group);
      game.sound.giggle();
    } },
    { cam: { pos: V(0, 4.8, 21), look: V(-4, 2.6, 9.5) }, dur: 0.6 },
    { tween: 1.7, fn: (k) => {
      if (!ghost) return;
      const x = -8 + 16 * smooth(k);
      ghost.group.position.set(x, 3.2 + Math.sin(k * Math.PI * 3) * 0.4, 8.6 + Math.sin(k * Math.PI) * 2.4);
      ghost.group.rotation.y = Math.PI / 2;
      cs.camLook.set(x * 0.7, 2.4, 9.6);
      if (ghost.animate) ghost.animate(game.time, 1 / 60);
    }, end: () => {
      if (ghost) {
        game.fx.puff(ghost.group.position, 0xe8f0ff, 14);
        game.scene.remove(ghost.group);
        ghost = null;
      }
    } },
    { do: () => game.sound.shriek(1.2) },
    { face: Math.PI + 0.5, dur: 0.3 },
    { cam: { pos: V(1.5, 3.4, 20.5), look: V(0, 1.4, 16.6) }, dur: 0.9 },
    { wait: 0.5 },
    { say: cs.radio(mate), text: mate.id === 'reshman'
      ? `( Faint, shadowy squeaking crackles over the radio... it's Reshman! It sounds trapped inside something flat and framed. )`
      : `${char.name}? Can you hear me? It's ${mate.name}! A ghost painter sealed me inside a portrait, somewhere deep in this mansion. Please... get me out!` },
    { face: Math.PI, dur: 0.4 },
    { say: cs.hero(char), text: fill(lines[1]) },
    { say: cs.prof(), text: `Professor Koç here! You heard ${mate.name}... That painter ghost must be Master Varnish. Remember: light first, then vacuum. Stun a ghost with your flashlight, then pull the opposite way it flies until it tires out.` },
    { say: cs.prof(), text: 'Clear a room of ghosts and its lights will come back on. I\'ll be listening on the Koç Radar, so I\'ll call whenever I spot something useful.' },
    { cam: { pos: V(0, 9, 27), look: V(0, 1.2, 12) }, dur: 2.4 },
    { title: 'THE WIDR 64 MANSION', sub: `RESCUE ${mate.name.toUpperCase()}`, dur: 2.6, hold: true },
    cs.backToPlay(1.0),
  ];
}

// A key turns in a lock: the camera swoops to the door, the key floats in
// and turns, the door swings open and we peek into the next room.
export function doorScene(game, door, label) {
  const toward = V(game.player.pos.x - door.center.x, 0, game.player.pos.z - door.center.z);
  if (toward.lengthSq() < 0.01) toward.set(door.axis === 'x' ? 0 : 1, 0, door.axis === 'x' ? 1 : 0);
  toward.normalize();
  const side = V(toward.z, 0, -toward.x);
  const c = V(door.center.x, 0, door.center.z);
  const beyondId = door.rooms.find((r) => r !== game.currentRoomId) || door.rooms[1];
  const beyond = game.mansion.rooms[beyondId];
  const def = ROOM_DEFS[beyondId] || {};
  const first = !game.cutscene.seen.has('door');
  game.cutscene.seen.add('door');
  let key = null;
  const keyFrom = new THREE.Vector3();
  const keyTo = c.clone().addScaledVector(toward, 0.32).setY(1.15);
  return (cs) => {
    cs.holdDoor = door;
    return [
      { cam: { pos: c.clone().addScaledVector(toward, 4.4).addScaledVector(side, 1.4).setY(2.5), look: c.clone().setY(1.3) }, dur: 0.75 },
      { do: () => {
        key = buildKey();
        keyFrom.copy(game.player.pos).setY(1.5);
        key.position.copy(keyFrom);
        game.scene.add(key);
        game.sound.keyJingle();
      } },
      { tween: 0.9, fn: (k) => {
        if (!key) return;
        key.position.lerpVectors(keyFrom, keyTo, easeOut(k));
        key.position.y += Math.sin(k * Math.PI) * 0.5;
        key.rotation.set(0, 0, 0);
        key.lookAt(c.x, 1.15, c.z);
        key.rotateX(-Math.PI / 2);
        key.rotateY((1 - k) * Math.PI * 4);
      } },
      { tween: 0.35, fn: (k) => {
        if (!key) return;
        key.rotation.set(0, 0, 0);
        key.lookAt(c.x, 1.15, c.z);
        key.rotateX(-Math.PI / 2);
        key.rotateY(smooth(k) * Math.PI / 2);
      } },
      { do: () => {
        game.sound.unlock();
        game.fx.sparkle(keyTo, 0xffd23a, 24);
        cs.addShake(0.2);
      } },
      { wait: 0.35 },
      { do: () => {
        if (key) {
          game.fx.sparkle(key.position, 0xffd23a, 10);
          game.scene.remove(key);
          key = null;
        }
        door.unlock();
        door.isOpen = true;
        door.target = 1.65 * door.openDir;
        game.sound.creak();
        cs.holdDoor = null;
      }, end: () => {
        if (key) game.scene.remove(key);
        key = null;
      } },
      { cam: { pos: c.clone().addScaledVector(toward, 1.6).setY(3.9), look: beyond ? V(beyond.cx, 0.8, beyond.cz) : c.clone().addScaledVector(toward, -5) }, dur: 1.2 },
      { title: def.name || label.toUpperCase(), sub: DOOR_FLAVOR[door.name] || (beyond ? LEVEL_NAMES[beyond.level] : ''), dur: first ? 2.4 : 1.8, hold: true },
      cs.backToPlay(0.8),
    ];
  };
}

// a big passage opens somewhere else in the mansion: cut over, watch, cut back
function remoteScene(game, { pos, look, title, sub, action, flash = 0x9a7dff, at }) {
  return (cs) => [
    { fade: 1, dur: 0.35 },
    { cut: { pos, look } },
    { fade: 0, dur: 0.45 },
    { wait: 0.35 },
    { do: () => {
      if (action) action(cs);
      if (at) {
        game.fx.sparkle(at, flash, 30);
        game.fx.ring(at.clone().setY(0.1), flash, 2.4);
      }
      cs.addShake(0.35);
    } },
    { cam: { pos: pos.clone().add(V(0, -0.8, -2.2)), look }, dur: 2.6 },
    { title, sub, dur: 2.4, hold: true },
    { fade: 1, dur: 0.35 },
    { cut: cs.rigPose() },
    { fade: 0, dur: 0.45 },
  ];
}

export function stairsScene(game) {
  return remoteScene(game, {
    pos: V(0, 5.2, 18.5), look: V(0, 1.6, 8.8), title: 'THE STAIRS ARE OPEN', sub: 'THE SECOND FLOOR AWAITS', at: V(0, 1.3, 8.8),
    action: () => {
      game.sound.chime('gem');
      game.sound.zap();
      for (const x of [-8.6, 8.6]) game.fx.sparkle(V(x, 1.4, 8.8), 0x9a7dff, 24);
    },
  });
}

export function cellarScene(game) {
  return remoteScene(game, {
    pos: V(33, 5.6, 19.5), look: V(33, 0.3, 13), title: 'THE TRAPDOOR IS OPEN', sub: 'DOWN TO THE BASEMENT', at: V(33, 0.3, 13), flash: 0xffc890,
    action: () => {
      game.sound.thud();
      game.sound.creak();
      game.fx.puff(V(33, 0.4, 13), 0xb8a890, 24);
    },
  });
}

export function cryptScene(game) {
  const door = game.mansion.doors.crypt;
  const c = door ? door.center : V(3.7, 0, 100);
  return remoteScene(game, {
    pos: V(c.x - 1, 4.4, c.z + 5.5), look: V(c.x, 1.2, c.z), title: 'THE CRYPT', sub: 'THE OLD DOOR GROANED OPEN...', at: V(c.x, 1.2, c.z), flash: 0xc8d0ff,
    action: () => {
      game.sound.creak();
      game.sound.bossRoar();
      game.fx.puff(V(c.x, 0.6, c.z), 0x8a8a90, 26);
    },
  });
}

// The rescue: the teammate bursts out of the painting, the two heroes
// talk, and every light in the mansion flickers back on.
export function endingScene(game) {
  const char = game.char;
  const mate = game.trappedChar;
  const paint = game.mansion.trapped.worldCenter().clone();
  const fill = (s) => s.replace('{t}', mate.name).replace('{h}', char.name);
  const land = V(paint.x + 0.8, 0, paint.z + 3.6);
  const stand = V(paint.x - 1.2, 0, paint.z + 5.4);
  const fog = game.scene.fog;
  const fogFar = fog ? fog.far : 46;
  let buddy = null;
  let buddyT = 0;
  const spawnBuddy = () => {
    if (buddy) return;
    buddy = buildHero(mate);
    buddy.scale = mate.stats.scale || 1;
    buddy.group.scale.setScalar(0.01);
    buddy.group.position.copy(paint);
    game.scene.add(buddy.group);
  };
  const faceEach = () => {
    if (!buddy) return;
    const p = game.player.pos;
    buddy.group.rotation.y = Math.atan2(p.x - buddy.group.position.x, p.z - buddy.group.position.z);
  };
  return (cs) => [
    { cam: { pos: V(paint.x, 4.4, paint.z + 8), look: V(paint.x, 2.6, paint.z) }, dur: 1.2, wait: true },
    { do: () => {
      spawnBuddy();
      game.hud.screenFlash(0.5);
      game.sound.explosionPop();
      game.fx.sparkle(paint, 0xb07dff, 30);
      cs.addShake(0.3);
    } },
    { tween: 1.3, fn: (k, dt) => {
      if (!buddy) return;
      const e = easeOut(k);
      buddy.group.position.lerpVectors(paint, land, e);
      buddy.group.position.y = (1 - e) * paint.y + Math.sin(k * Math.PI) * 1.6;
      buddy.group.scale.setScalar(buddy.scale * Math.min(1, 0.2 + k * 1.6));
      buddy.group.rotation.y = k * Math.PI * 4;
      if (Math.random() < dt * 30) game.fx.sparkle(buddy.group.position.clone().setY(buddy.group.position.y + 1), 0xd8b8ff, 2);
    }, end: () => {
      spawnBuddy();
      buddy.group.position.copy(land);
      buddy.group.scale.setScalar(buddy.scale);
    } },
    { do: () => {
      game.sound.thud();
      game.fx.puff(land.clone().setY(0.2), 0xd8c8a8, 16);
      cs.addShake(0.25);
    } },
    { cam: { pos: V(paint.x - 0.2, 4.2, paint.z + 12.5), look: V(paint.x - 0.2, 1.2, paint.z + 4.4) }, dur: 1.4 },
    { walk: stand, maxT: 3, speed: 0.7 },
    { do: faceEach },
    { face: Math.atan2(land.x - stand.x, land.z - stand.z), dur: 0.4 },
    { say: cs.hero(mate), text: mate.id === 'reshman'
      ? '( Reshman bounces around you in happy little circles. )'
      : `${char.name}! You actually did it! I've been stuck staring at this ballroom for ages.` },
    { say: cs.hero(char), text: fill(RESCUE[char.id] || RESCUE.nathan) },
    { tween: 0.6, fn: (k) => {
      if (buddy) buddy.group.position.y = Math.abs(Math.sin(k * Math.PI * 2)) * 0.5;
    }, end: () => {
      if (buddy) buddy.group.position.y = 0;
    } },
    { do: () => {
      // the whole mansion wakes up
      for (const id of Object.keys(game.mansion.rooms)) game.mansion.setRoomLit(id);
      game.sound.musicLightsOn();
      game.sound.victory();
      game.unlock('lights_on');
    } },
    { cam: { pos: V(4, 46, 24), look: V(4, 0, -12) }, dur: 4.5 },
    { tween: 4.5, fn: (k) => {
      if (fog) fog.far = fogFar + k * 110;
    } },
    { say: cs.hero(mate), text: mate.id === 'reshman' ? '( Reshman points up at the lights, eyes shining. )' : 'Look! The lights... the whole mansion is waking up!' },
    { say: cs.prof(), text: `Koç to ${char.name}! I can see every window glowing from my lab! You found ${mate.name}? Wonderful! Come down the hill, both of you. I'll meet you at the gate.` },
    { fade: 1, dur: 1.2, end: () => {
      if (fog) fog.far = fogFar;
      if (buddy) game.scene.remove(buddy.group);
      buddy = null;
    } },
    ...epilogueSteps(game, cs),
  ];
}


// ===================================================================
// STORY — told from outside the house. The mansion's windows light up
// as each part of it is cleared, so every chapter shows real progress.
// ===================================================================

// a hero figure for the outdoor shots, walking with the normal animation
function storyWalker(game, char, from) {
  const hero = buildHero(char);
  const s = (char.stats && char.stats.scale) || 1;
  hero.group.scale.setScalar(s);
  hero.group.position.copy(from);
  hero.group.rotation.y = Math.PI;
  game.getExterior().scene.add(hero.group);
  return {
    hero,
    // walk along a straight line; climbs the porch steps on the way
    walk(a, b, k, dt) {
      hero.group.position.lerpVectors(a, b, k);
      const z = hero.group.position.z;
      hero.group.position.y = z < 9.1 ? Math.min(1.2, (9.1 - z) * 0.5) : 0;
      hero.group.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
      if (hero.animate) hero.animate(game.time, 0.55, dt);
    },
    remove() {
      game.getExterior().scene.remove(hero.group);
    },
  };
}

function prologueSteps(game, cs) {
  const char = game.char;
  const mate = game.trappedChar;
  let ext = null;
  let mateW = null;
  let heroW = null;
  let profW = null;
  return [
    { do: () => {
      cs.setFade(1);
      cs.showExterior(true);
      ext = game.getExterior();
      ext.setLit([], true);
      for (const w of ext.windows[5]) w.color.set(0xb070ff); // the tower is haunted again
      ext.setDawn(0);
      ext.openDoors(0);
    } },
    { cut: { pos: V(-42, 32, 74), look: V(0, 11, 0) } },
    { cam: { pos: V(-16, 14, 50), look: V(0, 9, 0) }, dur: 11 },
    { fade: 0, dur: 2.2 },
    { title: 'THE MANSION ON THE HILL', sub: 'A WIDR 64 STORY', dur: 3.4, hold: true },
    { say: cs.narrator(), text: 'Nobody remembers the mansion being built. One stormy night it was simply there, on the hill past the edge of town.' },
    { say: cs.letter(), text: '<div class="letter-head">✉ CONGRATULATIONS, WIDR 64!</div>You have won a <b>MANSION</b>!<br>Come and collect your prize at once &mdash; and do bring the whole team.<div class="letter-sign">Your host, M. V.</div>' },
    { say: cs.narrator(), text: `${mate.name} couldn't wait. While the rest of the crew packed, ${mate.name} went up the hill alone...` },

    // the teammate walks up the path and the doors open by themselves
    { do: () => { mateW = storyWalker(game, mate, V(0.3, 0, 31)); } },
    { cut: { pos: V(7, 3.4, 36), look: V(0, 1.8, 26) } },
    { cam: { pos: V(5.5, 4.6, 19), look: V(0, 2.6, 6) }, dur: 5.6 },
    { tween: 5.6, fn: (k, dt) => mateW && mateW.walk(V(0.3, 0, 31), V(0, 0, 8.2), k, dt) },
    { do: () => game.sound.creak() },
    { tween: 1.3, fn: (k) => ext && ext.openDoors(smooth(k)) },
    { tween: 1.4, fn: (k, dt) => mateW && mateW.walk(V(0, 0, 8.2), V(0, 0, 4.4), k, dt) },
    { do: () => {
      if (mateW) mateW.remove();
      mateW = null;
    } },
    { tween: 0.5, fn: (k) => ext && ext.openDoors(1 - k) },
    { do: () => {
      game.sound.thud();
      cs.addShake(0.4);
    } },
    { wait: 0.6 },

    // up in the tower, the painter is at work
    { cut: { pos: V(12, 25, 26), look: V(5.2, 18.6, 0) } },
    { do: () => {
      if (ext) ext.flash = 1;
      game.sound.thunder();
    } },
    { cam: { pos: V(7.5, 19.8, 7.5), look: V(5.2, 18.6, 0) }, dur: 3.6 },
    { say: cs.narrator(), text: 'High in the tower, a ghost painter dabbed at a fresh canvas. Master Varnish was adding a new portrait to his Grand Gallery...' },
    { say: cs.narrator(), text: `...and it looked exactly like ${mate.name}.` },

    // the whole house: ghosts drift behind every dark window
    { cut: { pos: V(-30, 7, 30), look: V(-8, 6, 0) } },
    { cam: { pos: V(30, 8, 30), look: V(8, 7, 0) }, dur: 8 },
    { say: cs.narrator(), text: 'One by one, every light in the mansion went out. Ghosts drifted from room to room, waiting for the next guest.' },
    { wait: 1.5 },

    // the next morning: our hero at the gate, where the Professor is waiting
    { do: () => {
      heroW = storyWalker(game, char, V(0, 0, 36));
      profW = storyWalker(game, PROFESSOR, V(1.7, 0, 29.2));
      profW.hero.group.rotation.y = Math.PI; // peering up at the house
    } },
    { cut: { pos: V(-3.4, 2.3, 39), look: V(0, 2.4, 26) } },
    { tween: 3.4, fn: (k, dt) => {
      if (heroW) heroW.walk(V(0, 0, 36), V(0, 0, 28.4), k, dt);
      if (profW && profW.hero.animate) profW.hero.animate(game.time, 0, dt);
    } },
    { say: cs.narrator(), text: `The next morning, ${char.name} found the gate hanging open... and someone in a lab coat pacing beside it.` },
    { cut: { pos: V(-2.8, 2.0, 32.6), look: V(0.9, 1.5, 28.8) } },
    { do: () => {
      // the two turn to face each other
      if (heroW) heroW.hero.group.rotation.y = Math.atan2(1.7, 0.8);
      if (profW) profW.hero.group.rotation.y = Math.atan2(-1.7, -0.8);
    } },
    { say: cs.prof(true), text: `Ah, ${char.name}! Right on time. I've been watching this mansion from my lab down the hill ever since it appeared.` },
    { say: cs.hero(char), text: char.id === 'reshman' ? '( Reshman stares at the lab coat. Then at the glasses. Then back at the lab coat. )' : 'Deniz?! Since when are you a professor?' },
    { say: cs.prof(true), text: 'Since I found out ghosts are forty percent ice! It\'s Professor Koç now. And listen: last night I saw ' + mate.name + ' go through those doors. The lights went out... and nobody came back.' },
    ...(game.quests && game.quests.npcs.length ? [{ say: cs.prof(true), text: `Worse: the rest of WIDR 64 charged in after them. ${game.quests.npcs.map((n) => n.char.name).join(", ").replace(/, ([^,]*)$/, " and $1")}... all scattered somewhere inside. Find them! Help them out and they will fight by your side.` }] : []),
    { say: cs.prof(true), text: 'I\'m far too old for ghost hunting, but I build the gear for it. Take my Poltergust and this flashlight. Stun a ghost with the light, then vacuum it up.' },
    { say: cs.prof(true), text: 'And keep this on your belt: the Koç Radar. It maps every room you visit, and I can call you on it. Now go and bring ' + mate.name + ' home!' },
    { cam: { pos: V(0, 10, 36), look: V(0, 8, 0) }, dur: 3 },
    { tween: 3, fn: (k, dt) => {
      if (heroW) heroW.walk(V(0, 0, 28.4), V(0, 0, 20), k, dt);
      if (profW) {
        // the Professor waves the hero off
        profW.hero.group.rotation.y = Math.PI;
        if (profW.hero.parts.armR) profW.hero.parts.armR.rotation.set(-2.6, 0, -0.3 + Math.sin(game.time * 9) * 0.35);
        if (profW.hero.animate) profW.hero.animate(game.time, 0, dt);
      }
    } },
    { fade: 1, dur: 0.9 },
    { do: () => {
      if (heroW) heroW.remove();
      if (profW) profW.remove();
      heroW = profW = null;
      cs.showExterior(false);
    } },
  ];
}

const CHAPTERS = {
  1: { title: 'CHAPTER 2', sub: 'THE WEST WING', cam: [V(0, 5, 27), V(0, 3.4, 5)], text: 'With Grumbleclaw bagged, the ground floor glowed again. But from the West Wing came the sound of a piano that nobody was playing...',
    prof: 'Splendid work, {h}! Now, some ghosts in here are wrapped in fire, water or ice, and your light won\'t stun those. Suck up an element from a fireplace, sink or ice bucket and spray it at them. Water beats fire, ice beats water, fire beats ice!' },
  2: { title: 'CHAPTER 3', sub: 'THE UPPER FLOOR', cam: [V(-24, 7, 23), V(-12.5, 4, 3)], text: 'Madame Sonata took her final bow and the West Wing lit up. On the grand staircase, the ghostly barrier began to fade...',
    prof: 'Listen for the Koç Radar beeping, {h}. That means a Boo is hiding in the furniture of a lit room. The faster it beeps, the closer you are. Wait for it to peek, then vacuum!' },
  3: { title: 'CHAPTER 4', sub: 'THE EAST WING & THE CELLAR', cam: [V(0, 12, 25), V(0, 8.5, 5)], text: 'Lord Snoozewell woke up at last, and the upper floor was safe. But deep below the house, something rumbled in the boiler room.',
    prof: 'Speedy Spirits hide in the furniture of dark rooms, {h}. Any beam stuns them and they carry heaps of treasure, but once a room\'s lights come on, they\'re gone for good. Search first!' },
  4: { title: 'FINAL CHAPTER', sub: 'THE GRAND GALLERY', cam: [V(23, 5, 23), V(10, 2.6, 3)], text: 'Boilerbeard\'s fires went out and the cellar fell quiet. Only the tower still glowed purple. Master Varnish was waiting in the Ballroom, with {t}\'s portrait.',
    prof: 'This is it, {h}. Catch Master Varnish and his curse on {t}\'s portrait should break. Then aim your vacuum at the painting. I\'ll put the kettle on!' },
};

// after each area boss: cut outside and watch that part of the house light up
export function chapterScene(game, area) {
  const ch = CHAPTERS[area];
  if (!ch) return null;
  const mate = game.trappedChar;
  return (cs) => {
    const back = cs.rigPose();
    const lit = [1, 2, 3, 4].filter((a) => a < area);
    return [
      { fade: 1, dur: 0.5 },
      { do: () => {
        cs.showExterior(true);
        const ext = game.getExterior();
        ext.setLit(lit, true);
        ext.setDawn(area * 0.05);
      } },
      { cut: { pos: ch.cam[0], look: ch.cam[1] } },
      { cam: { pos: ch.cam[0].clone().add(V(0, -0.8, -4)), look: ch.cam[1] }, dur: 6 },
      { fade: 0, dur: 0.8 },
      { wait: 0.4 },
      { do: () => {
        game.getExterior().lightArea(area, 1.8);
        game.sound.musicLightsOn();
        game.sound.chime('gem');
      } },
      { wait: 1.6 },
      { say: cs.narrator(), text: ch.text.replace('{t}', mate.name) },
      { say: cs.prof(), text: ch.prof.replace(/\{t\}/g, mate.name).replace(/\{h\}/g, game.char.name) },
      { cam: { pos: V(0, 16, 46), look: V(0, 9, 0) }, dur: 2.4 },
      { title: ch.title, sub: ch.sub, dur: 2.8, hold: true },
      { fade: 1, dur: 0.6 },
      { do: () => cs.showExterior(false) },
      { cut: back },
      { fade: 0, dur: 0.6 },
    ];
  };
}

// the last shot of the story: dawn over a fully lit mansion
function epilogueSteps(game, cs) {
  const char = game.char;
  const mate = game.trappedChar;
  let a = null;
  let b = null;
  let p = null;
  return [
    { fade: 1, dur: 1 },
    { do: () => {
      cs.showExterior(true);
      const ext = game.getExterior();
      ext.setLit([1, 2, 3, 4], true);
      for (const w of ext.windows[5]) w.color.set(0xffc070);
      ext.setDawn(0.15);
      ext.openDoors(1);
      a = storyWalker(game, char, V(-0.7, 1.2, 5));
      b = storyWalker(game, mate, V(0.7, 1.2, 5));
      // the Professor has come up the path to meet them
      p = storyWalker(game, PROFESSOR, V(1.3, 0, 24.8));
    } },
    { cut: { pos: V(0, 6, 40), look: V(0, 8, 0) } },
    { cam: { pos: V(-8, 4, 33), look: V(0, 5, 4) }, dur: 9 },
    { fade: 0, dur: 1.2 },
    { do: () => game.getExterior().lightArea(5, 1) },
    { tween: 7, fn: (k, dt) => {
      const ext = game.getExterior();
      ext.setDawn(0.15 + smooth(k) * 0.85);
      if (a) a.walk(V(-0.7, 0, 5), V(-0.7, 0, 22), k, dt);
      if (b) b.walk(V(0.7, 0, 5), V(0.7, 0, 22), k, dt);
      if (p) {
        // waving the heroes home
        p.hero.group.rotation.y = Math.PI;
        if (p.hero.parts.armR) p.hero.parts.armR.rotation.set(-2.6, 0, -0.3 + Math.sin(game.time * 9) * 0.35);
        if (p.hero.animate) p.hero.animate(game.time, 0, dt);
      }
    } },
    { say: cs.narrator(), text: `As the sun came up, every window of the mansion glowed warm and gold. ${char.name} and ${mate.name} walked down the hill together, to where Professor Koç was waiting by the gate.` },
    { cut: { pos: V(-4.6, 2.3, 26.2), look: V(0.4, 1.3, 23.2) } },
    { do: () => {
      if (p) {
        p.hero.group.rotation.y = Math.PI;
        if (p.hero.parts.armR) p.hero.parts.armR.rotation.set(-0.25, 0, -0.15);
      }
    } },
    { say: cs.prof(true), text: `Ha! Look at you two, not even a scratch. Well... hardly a scratch. Every ghost you caught is safe in my lab, ${char.name}. Let's go home. The tea is ready.` },
    { say: cs.narrator(), text: 'Back at the lab, the Professor turned every captured ghost back into a painting. And in the Portrait Gallery, one new painting hung in pride of place: a grumpy ghost painter, framed at last.' },
    { cam: { pos: V(0, 22, 60), look: V(0, 10, 0) }, dur: 4 },
    { title: 'THE MANSION IS SAFE', sub: `${char.name.toUpperCase()} & ${mate.name.toUpperCase()} · WIDR 64`, dur: 3.4, hold: true },
    { fade: 1, dur: 1.4, end: () => {
      if (a) a.remove();
      if (b) b.remove();
      if (p) p.remove();
      a = b = p = null;
      const ext = game.getExterior();
      ext.openDoors(0);
    } },
  ];
}
