// ==========================================================
// main.js — core game loop, Three.js renderer, scene setup,
// input, particle FX, and the state machine:
//   BOOT → CHAR_SELECT ("Who's Playing?") → PLAYING ⇄ PAUSED → VICTORY / GAME_OVER
// ==========================================================
import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { CONFIG, ROOM_IDS, rankFor } from './config.js';
import { CHARACTERS, getCharacter, STICKERS } from './characters.js';
import { WidrBridge } from './widrBridge.js';
import { SoundEngine } from './audio/soundEngine.js';
import { makeGlowTexture, drawPortrait } from './graphics/textures.js';
import { buildHero, buildGhost, buildKey } from './graphics/models.js';
import { Player } from './entities/Player.js';
import { Ghost, BossGhost, PortraitGhost, Boo, SpeedySpirit } from './entities/Ghost.js';
import { LootSystem } from './entities/Interactable.js';
import { ElementSystem } from './entities/Elements.js';
import { Mansion, ROOM_DEFS, LEVEL_NAMES } from './world/MansionBuilder.js';
import { CameraRig } from './world/CameraRig.js';
import { HudManager, MenuScreens } from './ui/HudManager.js';
import { GALLERY, TIERS, gradeCapture } from './gallery.js';
import { PostFX, FX_UNIFORMS } from './graphics/postfx.js';
import { DustMotes } from './graphics/atmosphere.js';
import { CutsceneDirector, openingScene, doorScene, stairsScene, cellarScene, cryptScene, endingScene, chapterScene } from './cutscene.js';
import { Exterior } from './world/exterior.js';
import { Progress, UPGRADES } from './progression.js';
import { QuestSystem } from './entities/Quests.js';

const $ = (id) => document.getElementById(id);

// Regular ghost types (base stats before the area's difficulty scaling)
const GHOST_TYPES = {
  gold: { value: 2000, loot: { coin: 6, bill: 2, pearl: 0.5, heart: 0.3 } },
  blue: { value: 2500, loot: { coin: 6, bill: 2, pearl: 0.6, heart: 0.3 } },
  pink: { value: 3500, dodgy: true, speedMult: 1.35, loot: { coin: 7, bill: 3, pearl: 1, heart: 0.3 } },
  green: { value: 3000, damage: 8, speedMult: 1.1, loot: { coin: 6, bill: 3, pearl: 0.6, heart: 0.3 } },
  purple: { value: 4000, damage: 16, hpBonus: 20, speedMult: 0.95, style: 'punch', loot: { coin: 8, bill: 3, pearl: 1, heart: 0.4 } },
  tosser: { value: 3800, damage: 10, speedMult: 0.9, style: 'throw', loot: { coin: 7, bill: 3, pearl: 0.8, heart: 0.3 } },
  white: { value: 3500, damage: 6, dodgy: true, speedMult: 1.2, loot: { coin: 5, bill: 4, pearl: 1, heart: 0.3 } },
  red: { value: 4500, damage: 14, speedMult: 1.4, loot: { coin: 8, bill: 4, pearl: 1, gem: 0.3, heart: 0.4 } },
  // element ghosts: the flashlight does nothing, only their weakness stuns them
  fire: { value: 4200, damage: 12, hpBonus: 15, speedMult: 1.1, element: 'fire', loot: { coin: 8, bill: 3, pearl: 1, heart: 0.3 } },
  water: { value: 4200, damage: 10, hpBonus: 15, speedMult: 1.0, element: 'water', loot: { coin: 7, bill: 4, pearl: 1, heart: 0.3 } },
  ice: { value: 4400, damage: 10, hpBonus: 20, speedMult: 0.9, element: 'ice', loot: { coin: 7, bill: 3, pearl: 1, gem: 0.3, heart: 0.3 } },
};
// ghosts deeper in the mansion are tougher and worth more
const AREA_HP = { 1: 100, 2: 110, 3: 125, 4: 140, 5: 150 };
const AREA_VALUE = { 1: 1, 2: 1.15, 3: 1.3, 4: 1.45, 5: 1.6 };

// Boos: one per room, slipping into the furniture once that room is lit
const BOOS = [
  { id: 'bootstrap', name: 'Bootstrap', room: 'parlor' },
  { id: 'bouillon', name: 'Bouillon', room: 'dining' },
  { id: 'boolean', name: 'Boolean', room: 'study' },
  { id: 'bookworm', name: 'Bookworm', room: 'library' },
  { id: 'bootanist', name: 'Bootanist', room: 'conservatory' },
  { id: 'boogie', name: 'Boogie', room: 'ballroom' },
  { id: 'boolognese', name: 'Boolognese', room: 'kitchen' },
  { id: 'bubbleboo', name: 'Bubbleboo', room: 'bathroom' },
  { id: 'peekaboo', name: 'Peekaboo', room: 'nursery' },
  { id: 'boogeyman', name: 'Boogeyman', room: 'bedroom' },
  { id: 'starboo', name: 'Starboo', room: 'observatory' },
  { id: 'boondoggle', name: 'Boondoggle', room: 'storage' },
  { id: 'corkaboo', name: 'Corkaboo', room: 'winecellar' },
  { id: 'boodle', name: 'Boodle', room: 'crypt' },
];
const BOO_BUSTER_BONUS = 25000;

// Speedy Spirits: rare treasure ghosts hiding in these rooms while they're
// still dark. Catch one before you clear its room — the light scares it off.
const SPEEDIES = [
  { id: 'speedy_westhall', room: 'westhall' },
  { id: 'speedy_library', room: 'library' },
  { id: 'speedy_guestroom', room: 'guestroom' },
  { id: 'speedy_washroom', room: 'washroom' },
  { id: 'speedy_kitchen', room: 'kitchen' },
  { id: 'speedy_winecellar', room: 'winecellar' },
];

// Game state machine
export const State = {
  BOOT: 'BOOT',
  CHAR_SELECT: 'CHAR_SELECT',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  FAINTING: 'FAINTING', // short knock-out animation before GAME_OVER
  VICTORY: 'VICTORY',
  GAME_OVER: 'GAME_OVER',
  DATA_SELECT: 'DATA_SELECT', // portrait gallery: Data 1-3 + Options
  OPTIONS: 'OPTIONS',
  GALLERY: 'GALLERY', // framed portrait ghosts (from the data select)
  BRIGHTNESS: 'BRIGHTNESS',
  SAVE: 'SAVE', // "Save Game / Quit" after the rescue
  CUTSCENE: 'CUTSCENE', // in-engine cinematic (arrival, keys and big doors, rescue)
  WORKSHOP: 'WORKSHOP', // spend banked treasure on vacuum upgrades
};

// ===================================================================
// INPUT — keyboard + mouse, pure-keyboard arcade mode, and gamepads
// (standard mapping: left stick moves, right stick aims, RT vacuums,
// LT / X toggles the light, A acts, B backs out, START pauses)
// ===================================================================
const PAD = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, BACK: 8, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
const PAD_DEAD = 0.2;

// radial deadzone, rescaled so the stick still reaches full speed
function padStick(ax, ay) {
  const len = Math.hypot(ax, ay);
  if (len < PAD_DEAD) return { x: 0, y: 0, len: 0 };
  const k = Math.min(1, (len - PAD_DEAD) / (1 - PAD_DEAD)) / len;
  return { x: ax * k, y: ay * k, len: Math.min(1, len) };
}

class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressed = new Set();
    // gamepad state, refreshed by pollPad() at the top of every frame
    this.pad = {
      connected: false, index: -1, active: false,
      moveX: 0, moveZ: 0, aimX: 0, aimZ: 0, aimLen: 0,
      vacuum: 0, lightPressed: false, interactPressed: false, spray: false, sprayPressed: false,
      buttons: [], prev: [], navHeld: null, navTimer: 0,
    };
    this.rumbleUntil = 0;
    window.addEventListener('gamepadconnected', (e) => {
      if (this.pad.index < 0) this.pad.index = e.gamepad.index;
      this.pad.connected = true;
      if (this.onPadChange) this.onPadChange(true, e.gamepad.id);
    });
    window.addEventListener('gamepaddisconnected', (e) => {
      if (e.gamepad.index !== this.pad.index) return;
      this.pad.index = -1;
      this.pad.connected = false;
      this.pad.active = false;
      this.pad.buttons = [];
      this.pad.prev = [];
      if (this.onPadChange) this.onPadChange(false, e.gamepad.id);
    });
    this.mouse = new THREE.Vector2();
    this.mouseInside = false;
    this.mouseAim = false;
    this.mouseMovedFrame = false;
    this.lmb = false;
    this.rmb = false;
    this.lmbPressed = false;
    this.canvas = canvas;

    const blockKeys = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'Tab']);
    window.addEventListener('keydown', (e) => {
      if (blockKeys.has(e.code)) e.preventDefault();
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
      this.pad.active = false;
      if (e.code.startsWith('Arrow')) this.mouseAim = false;
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.lmb = this.rmb = false;
    });
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.mouseInside = true;
      this.mouseAim = true;
      this.mouseMovedFrame = true;
      if (Math.abs(e.movementX) + Math.abs(e.movementY) > 2) this.pad.active = false;
    });
    canvas.addEventListener('mouseleave', () => (this.mouseInside = false));
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.lmb = true;
        this.lmbPressed = true;
      }
      if (e.button === 2) this.rmb = true;
      this.mouseAim = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.lmb = false;
      if (e.button === 2) this.rmb = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  down(...codes) {
    return codes.some((c) => this.keys.has(c));
  }

  hit(...codes) {
    return codes.some((c) => this.pressed.has(c));
  }

  // --- gamepad ------------------------------------------------------
  getPad() {
    if (!navigator.getGamepads) return null;
    const pads = navigator.getGamepads();
    if (!pads) return null;
    let gp = this.pad.index >= 0 ? pads[this.pad.index] : null;
    if (!gp) {
      // some browsers only report pads after the first button press
      for (const p of pads) {
        if (p && p.connected) {
          gp = p;
          this.pad.index = p.index;
          if (!this.pad.connected) {
            this.pad.connected = true;
            if (this.onPadChange) this.onPadChange(true, p.id);
          }
          break;
        }
      }
    }
    return gp && gp.connected ? gp : null;
  }

  padDown(i) {
    return !!this.pad.buttons[i];
  }

  padHit(i) {
    return !!this.pad.buttons[i] && !this.pad.prev[i];
  }

  // Reads the pad once per frame. In menus the d-pad / left stick / face
  // buttons are translated into the same key codes the menus already
  // listen for; in gameplay the analog values are exposed on this.pad.
  pollPad(dt, mode) {
    const menuMode = mode !== 'play';
    const P = this.pad;
    P.lightPressed = false;
    P.interactPressed = false;
    P.spray = false;
    P.sprayPressed = false;
    P.swapPressed = false;
    const gp = this.getPad();
    if (!gp) {
      P.moveX = P.moveZ = P.aimX = P.aimZ = P.aimLen = P.vacuum = 0;
      return;
    }
    P.prev = P.buttons;
    P.buttons = gp.buttons.map((b) => b.pressed || b.value > 0.5);
    const trig = (i) => (gp.buttons[i] ? Math.max(gp.buttons[i].value, gp.buttons[i].pressed ? 1 : 0) : 0);

    const ax = gp.axes;
    const L = padStick(ax[0] || 0, ax[1] || 0);
    const R = padStick(ax[2] || 0, ax[3] || 0);
    // d-pad doubles as a digital left stick
    const dx = (this.padDown(PAD.RIGHT) ? 1 : 0) - (this.padDown(PAD.LEFT) ? 1 : 0);
    const dz = (this.padDown(PAD.DOWN) ? 1 : 0) - (this.padDown(PAD.UP) ? 1 : 0);
    P.moveX = L.len > 0 ? L.x : dx;
    P.moveZ = L.len > 0 ? L.y : dz;
    P.aimX = R.x;
    P.aimZ = R.y;
    P.aimLen = R.len;
    P.vacuum = Math.max(trig(PAD.RT), this.padDown(PAD.RB) ? 1 : 0);

    const anyUse = L.len > 0 || R.len > 0 || P.vacuum > 0.3 || P.buttons.some((b, i) => b && !P.prev[i]);
    if (anyUse) {
      P.active = true;
      this.mouseAim = false;
    }

    // START always pauses / resumes (KeyP is handled by every screen that pauses)
    if (this.padHit(PAD.START)) this.pressed.add(mode === 'menu' ? 'Enter' : 'KeyP');

    if (menuMode) {
      if (this.padHit(PAD.A)) this.pressed.add('Enter');
      if (this.padHit(PAD.B)) this.pressed.add('Escape');
      if (this.padHit(PAD.Y)) this.pressed.add('KeyC');
      if (this.padHit(PAD.X)) this.pressed.add('Delete');
      // stick / d-pad navigation with auto-repeat
      let dir = null;
      const nx = Math.abs(P.moveX) > 0.55 ? Math.sign(P.moveX) : 0;
      const nz = Math.abs(P.moveZ) > 0.55 ? Math.sign(P.moveZ) : 0;
      if (Math.abs(P.moveX) >= Math.abs(P.moveZ)) {
        if (nx) dir = nx > 0 ? 'ArrowRight' : 'ArrowLeft';
      } else if (nz) dir = nz > 0 ? 'ArrowDown' : 'ArrowUp';
      if (!dir) {
        P.navHeld = null;
      } else if (dir !== P.navHeld) {
        P.navHeld = dir;
        P.navTimer = 0.42;
        this.pressed.add(dir);
      } else {
        P.navTimer -= dt;
        if (P.navTimer <= 0) {
          P.navTimer = 0.13;
          this.pressed.add(dir);
        }
      }
    } else {
      P.navHeld = null;
      P.lightPressed = this.padHit(PAD.LT) || this.padHit(PAD.X) || this.padHit(PAD.LB);
      P.interactPressed = this.padHit(PAD.A);
      P.spray = this.padDown(PAD.Y);
      P.sprayPressed = this.padHit(PAD.Y);
      P.swapPressed = this.padHit(PAD.B);
    }
  }

  // dual-motor rumble (Chrome / Edge / Firefox with vibrationActuator)
  rumble(weak, strong, ms) {
    const gp = this.getPad();
    if (!gp) return;
    const act = gp.vibrationActuator;
    const now = performance.now();
    try {
      if (act && act.playEffect) {
        act.playEffect('dual-rumble', {
          startDelay: 0, duration: ms,
          weakMagnitude: Math.min(1, Math.max(0, weak)),
          strongMagnitude: Math.min(1, Math.max(0, strong)),
        });
        this.rumbleUntil = now + ms;
      } else if (gp.hapticActuators && gp.hapticActuators[0]) {
        gp.hapticActuators[0].pulse(Math.max(weak, strong), ms);
        this.rumbleUntil = now + ms;
      }
    } catch (e) {
      /* rumble unsupported on this pad */
    }
  }

  stopRumble() {
    this.rumbleUntil = 0;
    const gp = this.getPad();
    if (!gp || !gp.vibrationActuator || !gp.vibrationActuator.reset) return;
    try { gp.vibrationActuator.reset(); } catch (e) { /* ignore */ }
  }

  endFrame() {
    this.pressed.clear();
    this.lmbPressed = false;
    this.mouseMovedFrame = false;
  }
}

// ===================================================================
// FX — sprite particles: puffs, sparkles, stars, sparks, shards
// ===================================================================
class Effects {
  // All sparkles, puffs and dust share two pooled point clouds (one glowing,
  // one solid), so a big burst costs 2 draw calls instead of hundreds of
  // sprites with their own materials.
  constructor(scene) {
    this.scene = scene;
    this.tex = makeGlowTexture('#ffffff');
    this.rings = [];
    this.uScale = { value: 900 };
    this.layers = [this.makeLayer(true), this.makeLayer(false)];
    this.tmpColor = new THREE.Color();
  }

  makeLayer(additive, N = 400) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3).fill(-500);
    const col = new Float32Array(N * 3);
    const size = new Float32Array(N);
    const alpha = new Float32Array(N);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: this.tex }, uScale: this.uScale },
      vertexShader: `
        attribute vec3 aColor; attribute float aSize; attribute float aAlpha;
        uniform float uScale;
        varying vec3 vColor; varying float vAlpha;
        void main() {
          vColor = aColor; vAlpha = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aAlpha > 0.0 ? aSize * uScale / -mv.z : 0.0;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D uMap;
        varying vec3 vColor; varying float vAlpha;
        void main() {
          vec4 t = texture2D(uMap, gl_PointCoord);
          gl_FragColor = vec4(vColor * t.rgb, t.a * vAlpha);
        }`,
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    points.renderOrder = 6;
    this.scene.add(points);
    return {
      points, N, cursor: 0, live: 0,
      pos, col, size, alpha,
      vel: new Float32Array(N * 3), life: new Float32Array(N), max: new Float32Array(N),
      base: new Float32Array(N), grav: new Float32Array(N), drag: new Float32Array(N),
    };
  }

  // world-size → pixels for the current screen height and field of view
  setView(heightPx, fovDeg) {
    this.uScale.value = (heightPx * 0.5) / Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2);
  }

  emit(pos, color, n, { speed = 3, up = 2, life = 0.8, size = 0.35, gravity = 0, drag = 2, additive = true, spread = 0.2 } = {}) {
    const L = this.layers[additive ? 0 : 1];
    const c = this.tmpColor.set(color);
    for (let i = 0; i < n; i++) {
      // ring buffer: when full, the oldest particle is recycled
      const k = L.cursor;
      L.cursor = (L.cursor + 1) % L.N;
      if (L.life[k] <= 0) L.live++;
      L.pos[k * 3] = pos.x + (Math.random() - 0.5) * spread;
      L.pos[k * 3 + 1] = pos.y + (Math.random() - 0.5) * spread;
      L.pos[k * 3 + 2] = pos.z + (Math.random() - 0.5) * spread;
      L.col[k * 3] = c.r;
      L.col[k * 3 + 1] = c.g;
      L.col[k * 3 + 2] = c.b;
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.3 + Math.random() * 0.7);
      L.vel[k * 3] = Math.cos(a) * sp;
      L.vel[k * 3 + 1] = up * (0.4 + Math.random() * 0.8);
      L.vel[k * 3 + 2] = Math.sin(a) * sp;
      L.life[k] = life;
      L.max[k] = life;
      L.base[k] = size * (0.6 + Math.random() * 0.8);
      L.grav[k] = gravity;
      L.drag[k] = drag;
      L.alpha[k] = 1;
      L.size[k] = L.base[k];
    }
  }

  puff(pos, color, n = 14) {
    this.emit(pos, color, n, { speed: 2.4, up: 1.2, life: 0.9, size: 0.6, drag: 3 });
  }

  sparkle(pos, color, n = 8) {
    this.emit(pos, color, n, { speed: 2, up: 3, life: 0.6, size: 0.25 });
  }

  stars(pos, color) {
    this.emit(pos.clone().add(new THREE.Vector3(0, 0.8, 0)), color, 12, { speed: 3.5, up: 2.5, life: 0.9, size: 0.35, gravity: 4 });
  }

  spark(pos, color, n = 4) {
    this.emit(pos, color, n, { speed: 6, up: 2, life: 0.25, size: 0.18, drag: 1 });
  }

  crumbs(pos) {
    this.emit(pos, 0xc87a3a, 3, { speed: 1.6, up: 2.5, life: 0.6, size: 0.12, gravity: 9, additive: false });
  }

  shards(pos) {
    this.emit(pos, 0xf6f2ea, 10, { speed: 4, up: 3, life: 0.7, size: 0.16, gravity: 12, additive: false });
  }

  footDust(pos) {
    this.emit(pos.clone().setY(0.1), 0x8a8070, 2, { speed: 0.6, up: 0.4, life: 0.5, size: 0.3, additive: false, drag: 3 });
  }

  explosion(pos) {
    this.emit(pos, 0xffa040, 26, { speed: 7, up: 4, life: 0.7, size: 0.5, gravity: 4 });
    this.emit(pos, 0xfff36b, 16, { speed: 9, up: 5, life: 0.45, size: 0.25, gravity: 2 });
    this.ring(pos, 0xffa040, 4);
  }

  ring(pos, color, radius = 3.5) {
    if (!Effects.RING_GEO) Effects.RING_GEO = new THREE.RingGeometry(0.8, 1, 40);
    const m = new THREE.Mesh(
      Effects.RING_GEO,
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.copy(pos).setY(0.15);
    this.scene.add(m);
    this.rings.push({ m, life: 0.45, max: 0.45, radius });
  }

  update(dt) {
    for (const L of this.layers) {
      if (L.live <= 0) continue;
      let live = 0;
      for (let k = 0; k < L.N; k++) {
        if (L.life[k] <= 0) continue;
        L.life[k] -= dt;
        if (L.life[k] <= 0) {
          L.alpha[k] = 0;
          continue;
        }
        live++;
        const i3 = k * 3;
        L.vel[i3 + 1] -= L.grav[k] * dt;
        const d = Math.max(0, 1 - L.drag[k] * dt);
        L.vel[i3] *= d;
        L.vel[i3 + 1] *= d;
        L.vel[i3 + 2] *= d;
        L.pos[i3] += L.vel[i3] * dt;
        L.pos[i3 + 1] += L.vel[i3 + 1] * dt;
        L.pos[i3 + 2] += L.vel[i3 + 2] * dt;
        if (L.pos[i3 + 1] < 0.05) {
          L.pos[i3 + 1] = 0.05;
          L.vel[i3 + 1] *= -0.3;
        }
        const f = L.life[k] / L.max[k];
        L.alpha[k] = f;
        L.size[k] = L.base[k] * (0.5 + f * 0.5);
      }
      L.live = live;
      const a = L.points.geometry.attributes;
      a.position.needsUpdate = true;
      a.aColor.needsUpdate = true;
      a.aSize.needsUpdate = true;
      a.aAlpha.needsUpdate = true;
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      const k = 1 - r.life / r.max;
      const s = 0.3 + k * r.radius;
      r.m.scale.set(s, s, s);
      r.m.material.opacity = (1 - k) * 0.8;
      if (r.life <= 0) {
        this.scene.remove(r.m);
        r.m.material.dispose();
        this.rings.splice(i, 1);
      }
    }
  }

  clear() {
    for (const L of this.layers) {
      L.life.fill(0);
      L.alpha.fill(0);
      L.live = 0;
      L.points.geometry.attributes.aAlpha.needsUpdate = true;
    }
    for (const r of this.rings) this.scene.remove(r.m);
    this.rings.length = 0;
  }
}

// ===================================================================
// GAME
// ===================================================================
class Game {
  constructor() {
    this.state = State.BOOT;
    this.clock = new THREE.Clock();
    this.time = 0;

    // --- renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, CONFIG.render.pixelRatioCap) * CONFIG.render.retroScale);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = CONFIG.render.toneExposure;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // HDR scene target + bloom + grading (see graphics/postfx.js)
    this.postfx = new PostFX(this.renderer);
    $('stage').appendChild(this.renderer.domElement);
    this.renderer.domElement.tabIndex = 0;

    this.camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, 1, 0.1, 120);
    this.rig = new CameraRig(this.camera);
    this.input = new Input(this.renderer.domElement);
    this.rig.onShake = (a) => {
      if (this.state === State.PLAYING || this.state === State.FAINTING) this.input.rumble(a * 1.2, a * 1.6, 90 + a * 320);
    };
    this.tugRumbleTimer = 0;
    this.padLabels = false;
    this.sound = new SoundEngine();
    this.sound.attachUnlock();
    this.hud = new HudManager();
    // a short radio chirp when Professor Koç sends a new tip (at most every few seconds)
    let lastChirp = -10;
    this.hud.onTutorial = () => {
      const now = performance.now() / 1000;
      if (now - lastChirp < 4) return;
      lastChirp = now;
      [0, 70, 140].forEach((ms, i) => setTimeout(() => this.sound.talk(0.8 + i * 0.04, true), ms));
    };
    this.cutscene = new CutsceneDirector(this);
    this.input.onPadChange = (on) => {
      this.hud.toast(on ? '🎮 Controller connected' : '🎮 Controller disconnected', on ? '' : 'danger');
      // losing the controller mid-run pauses, like a console would
      if (!on && this.state === State.PLAYING) this.togglePause();
    };
    this.bridge = WidrBridge;
    this.progress = new Progress(this.bridge);
    this.wsIndex = 0;
    this.raycaster = new THREE.Raycaster();
    this.aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.0);
    this.aimPoint = new THREE.Vector3();

    this.scene = null;
    this.selectedIndex = Math.max(0, CHARACTERS.findIndex((c) => c.id === this.bridge.data.lastHero));

    this.buildTitleScene();
    this.buildPreview();
    this.fileIndex = 0;
    this.options = this.loadOptions();
    this.menus = new MenuScreens(this, CHARACTERS);
    this.buildSelectUI();
    this.wireUI();
    this.applySettings();
    this.onResize();
    window.addEventListener('resize', () => this.onResize());
    if (window.ResizeObserver) new ResizeObserver(() => this.onResize()).observe($('app'));

    // fullscreen: F key or the corner button (must run inside the real input event)
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyF' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) this.toggleFullscreen();
    });
    $('fs-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleFullscreen();
      $('fs-btn').blur();
    });
    const onFsChange = () => {
      const on = !!(document.fullscreenElement || document.webkitFullscreenElement);
      document.body.classList.toggle('is-fullscreen', on);
      $('fs-btn').title = on ? 'Exit fullscreen (F)' : 'Fullscreen (F)';
      requestAnimationFrame(() => this.onResize());
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);

    this.bridge.on('WIDR_PAUSE', () => this.state === State.PLAYING && this.togglePause());
    this.bridge.on('WIDR_RESUME', () => this.state === State.PAUSED && this.togglePause());
    this.bridge.on('WIDR_MUTE', (p) => this.setMuted(p && 'muted' in p ? !!p.muted : !this.sound.muted));
    this.bridge.ready();

    const best = this.bridge.bestOverall();
    $('boot-best').textContent = best ? `BEST: $${best.cash.toLocaleString('en-US')} (RANK ${best.rank}) AS ${getCharacter(best.id).name.toUpperCase()}` : '';

    this.renderer.setAnimationLoop(() => this.frame());
  }

  // ---------------------------------------------------------------
  applySettings() {
    this.sound.setMuted(this.bridge.getSetting('muted', false));
    this.applyOptions();
  }

  // Options screen values (Sound / Vibration / Control / CRT / Brightness)
  loadOptions() {
    const saved = this.bridge.getSetting('options', null) || {};
    return {
      sound: saved.sound || 'stereo',
      shake: saved.shake !== undefined ? saved.shake : true,
      control: saved.control || 'standard',
      crt: saved.crt !== undefined ? saved.crt : this.bridge.getSetting('crt', false),
      brightness: saved.brightness || 4,
      gfx: saved.gfx || 'high',
    };
  }

  setOption(key, value) {
    this.options[key] = value;
    this.bridge.setSetting('options', this.options);
    if (key === 'crt') this.bridge.setSetting('crt', value);
    this.applyOptions();
  }

  applyOptions() {
    const o = this.options;
    document.body.classList.toggle('crt-on', !!o.crt);
    this.sound.setMono(o.sound === 'mono');
    this.rig.shakeScale = o.shake ? 1 : 0;
    if (this.postfx) this.postfx.setQuality(o.gfx);
    if (this.player && this.player.spot) this.player.spot.castShadow = o.gfx !== 'low';
    this.renderer.toneMappingExposure = CONFIG.render.toneExposure * (0.6 + o.brightness * 0.1);
    this.updatePauseLabels();
  }

  // ---------------------------------------------------------------
  // Luigi's Mansion–style menu flow:
  // Title → Data Select → (Options / Brightness) → Who's Playing? → play
  goTitle() {
    this.endRun();
    this.setState(State.BOOT);
    this.showScreen('boot');
    this.hud.show(false);
    const best = this.bridge.bestOverall();
    $('boot-best').textContent = best ? `BEST: $${best.cash.toLocaleString('en-US')} (RANK ${best.rank}) AS ${getCharacter(best.id).name.toUpperCase()}` : '';
  }

  goDataSelect(focus = this.fileIndex) {
    this.endRun();
    this.setState(State.DATA_SELECT);
    this.showScreen('dataselect');
    this.hud.show(false);
    this.menus.openDataSelect(focus);
  }

  selectFile(i) {
    this.fileIndex = i;
    const f = this.bridge.getFile(i);
    if (f && f.checkpoint && f.checkpoint.hero) {
      // a saved run in progress: jump straight back into the mansion
      const ch = getCharacter(f.checkpoint.hero);
      this.selectedIndex = Math.max(0, CHARACTERS.findIndex((c) => c.id === ch.id));
      this.sound.init();
      this.sound.confirm();
      this.bridge.characterSelected(ch.id);
      this.startRun(ch, f.checkpoint);
      return;
    }
    if (f) {
      const idx = CHARACTERS.findIndex((c) => c.id === f.hero);
      if (idx >= 0) this.selectedIndex = idx;
    }
    this.goSelect();
  }

  goOptions(fromBrightness = false) {
    this.setState(State.OPTIONS);
    this.showScreen('options');
    if (fromBrightness) this.menus.renderOptions();
    else this.menus.openOptions();
  }

  closeOptions() {
    this.goDataSelect(3);
  }

  goGallery() {
    this.setState(State.GALLERY);
    this.showScreen('gallery');
    this.menus.openGallery();
  }

  closeGallery() {
    this.goDataSelect(4);
  }

  goBrightness() {
    this.setState(State.BRIGHTNESS);
    this.showScreen('brightness');
    this.menus.openBrightness();
  }

  // after the rescue: save screen, then the rank mansion
  goSave() {
    this.saveMode = 'final';
    this.setState(State.SAVE);
    this.sound.setVacuum(false);
    this.sound.setTug(false);
    this.hud.show(false);
    this.showScreen('save');
    this.menus.openSave(this.char, this.fileIndex);
  }

  saveRunToFile() {
    this.bridge.recordRunInFile(this.fileIndex, {
      heroId: this.char.id, cash: this.cash, rank: rankFor(this.cash), rescuedId: this.trappedChar.id,
    });
  }

  showRankScreen() {
    if (this.state !== State.SAVE) return;
    this.finishRun(true);
  }

  afterResults() {
    const f = this.bridge.getFile(this.fileIndex);
    if (this.state === State.VICTORY || (f && f.checkpoint)) this.goDataSelect(this.fileIndex);
    else this.goSelect();
  }

  setMuted(m) {
    this.sound.setMuted(m);
    this.bridge.setSetting('muted', m);
    this.updatePauseLabels();
    if (this.state === State.PLAYING) this.hud.toast(m ? '🔇 Audio muted' : '🔊 Audio on', 'info');
  }

  toggleFullscreen() {
    const doc = document;
    const el = doc.documentElement;
    if (doc.fullscreenElement || doc.webkitFullscreenElement) {
      (doc.exitFullscreen || doc.webkitExitFullscreen).call(doc);
      return;
    }
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req) {
      this.hud.toast('Fullscreen is not supported here.', 'danger');
      return;
    }
    const p = req.call(el, { navigationUI: 'hide' });
    if (p && p.catch) p.catch(() => this.hud.toast('Fullscreen was blocked by the browser. Try the ⛶ button.', 'danger'));
  }

  toggleCRT() {
    this.setOption('crt', !this.options.crt);
    if (this.state === State.OPTIONS) this.menus.renderOptions();
  }

  updatePauseLabels() {
    this.hud.updatePauseLabels(this.sound.muted, document.body.classList.contains('crt-on'));
  }

  setState(s) {
    if (this.state === s) return;
    const prev = this.state;
    this.state = s;
    document.body.dataset.state = s;
    if (CONFIG.debug) console.log('[state]', prev, '→', s);
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    if (this.postfx) this.postfx.setSize(w, h, this.renderer.getPixelRatio());
    if (this.fx && this.fx.setView) this.fx.setView(this.renderer.domElement.height, this.camera.fov);
    this.pauseDirty = true;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.preview) {
      const el = $('hero-preview');
      const pw = Math.max(10, el.clientWidth);
      const ph = Math.max(10, el.clientHeight);
      this.preview.renderer.setSize(pw, ph, false);
      this.preview.camera.aspect = pw / ph;
      this.preview.camera.updateProjectionMatrix();
    }
  }

  // ---------------------------------------------------------------
  // title backdrop: a spooky mansion silhouette behind boot/select
  buildTitleScene() {
    const s = new THREE.Scene();
    s.background = new THREE.Color(0x0b0a18);
    s.fog = new THREE.Fog(0x0b0a18, 10, 40);
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeGlowTexture('#f4f0d0'), transparent: true, depthWrite: false }));
    moon.scale.set(9, 9, 9);
    moon.position.set(8, 9, -20);
    s.add(moon);
    const mat = new THREE.MeshBasicMaterial({ color: 0x05040a });
    const house = new THREE.Group();
    const add = (w, h, d, x, y, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      house.add(m);
    };
    add(14, 6, 4, 0, 3, -14);
    add(4, 10, 4, -5, 5, -14);
    add(3, 8, 3, 6, 4, -13);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 3, 4), mat);
    roof.position.set(-5, 11.5, -14);
    roof.rotation.y = Math.PI / 4;
    house.add(roof);
    const roof2 = new THREE.Mesh(new THREE.ConeGeometry(2.4, 2.5, 4), mat);
    roof2.position.set(6, 9.2, -13);
    roof2.rotation.y = Math.PI / 4;
    house.add(roof2);
    // glowing windows
    const winMat = new THREE.MeshBasicMaterial({ color: 0xffc070 });
    for (const [x, y] of [[-5, 6], [-5, 8], [-1, 3], [2, 3], [6, 5], [-1, 5], [2, 5]]) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1), winMat);
      w.position.set(x, y, -11.9);
      house.add(w);
    }
    s.add(house);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshBasicMaterial({ color: 0x07060c }));
    ground.rotation.x = -Math.PI / 2;
    s.add(ground);
    const ghosts = [];
    ['gold', 'blue', 'pink'].forEach((k, i) => {
      const g = buildGhost(k);
      g.group.position.set(-6 + i * 6, 4, -9 - i);
      g.bodyMat.opacity = 0.6;
      s.add(g.group);
      ghosts.push(g);
    });
    s.add(new THREE.AmbientLight(0x6070c0, 1.2));
    const cam = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    cam.position.set(0, 3, 8);
    cam.lookAt(0, 4, -10);
    this.title = { scene: s, camera: cam, ghosts };
  }

  // menus play in front of the full 3D mansion at night: a slow orbit for
  // the title and file screens, a low shot by the gate for hero select
  renderTitle(dt) {
    // file select, options, gallery and brightness sit on opaque gallery
    // walls: skip drawing the 3D mansion that nobody can see behind them
    const S = this.state;
    if (S === State.DATA_SELECT || S === State.OPTIONS || S === State.GALLERY || S === State.BRIGHTNESS || S === State.WORKSHOP) return;
    const T = this.title;
    const ext = this.getExterior();
    if (!T.menuReady || this.viewScene) {
      ext.setLit([], true);
      ext.setDawn(0);
      ext.openDoors(0);
      for (const w of ext.windows[5]) w.color.set(0xb070ff);
      T.menuReady = true;
      T.camPos = null;
    }
    // no thunder on the hero select (it rumbled every few seconds while choosing)
    const quiet = this.state !== State.BOOT;
    ext.update(dt, quiet ? null : this.sound);
    const t = this.time;
    const pos = new THREE.Vector3();
    const look = new THREE.Vector3();
    if (this.state === State.CHAR_SELECT) {
      const a = Math.sin(t * 0.05) * 0.25;
      pos.set(Math.sin(a) * 30, 3.4 + Math.sin(t * 0.2) * 0.4, 30 + Math.cos(a) * 4);
      look.set(0, 7.5, 0);
    } else {
      const a = -0.45 + Math.sin(t * 0.035) * 0.4;
      pos.set(Math.sin(a) * 54, 13 + Math.sin(t * 0.09) * 2.5, Math.cos(a) * 54);
      look.set(0, 9.5, 0);
    }
    if (!T.camPos) {
      T.camPos = pos.clone();
      T.camLook = look.clone();
    }
    const k = Math.min(1, dt * 1.2);
    T.camPos.lerp(pos, k);
    T.camLook.lerp(look, k);
    T.camera.position.copy(T.camPos);
    T.camera.lookAt(T.camLook);
    if (T.camera.far !== 420) T.camera.far = 420;
    T.camera.aspect = this.camera.aspect;
    T.camera.updateProjectionMatrix();
    const sm = this.renderer.shadowMap;
    if (this.state === State.CHAR_SELECT) {
      // behind the dark select overlay: 30 fps, no bloom pass, shadows baked
      // once, so the hero preview gets the GPU time
      if (sm.autoUpdate) {
        sm.autoUpdate = false;
        sm.needsUpdate = true;
      }
      T.skip = !T.skip;
      if (T.skip) return;
      this.renderer.setRenderTarget(null);
      this.renderer.render(ext.scene, T.camera);
      return;
    }
    sm.autoUpdate = true;
    this.postfx.render(ext.scene, T.camera);
  }

  // ---------------------------------------------------------------
  // 3D rotating hero preview on the select screen
  buildPreview() {
    const el = $('hero-preview');
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    el.appendChild(renderer.domElement);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap; // soft shadows cost ~4x for one little stage
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1.4, 0.1, 50);
    camera.position.set(0, 1.55, 5.6);
    camera.lookAt(0, 0.95, 0);
    scene.add(new THREE.HemisphereLight(0x9aa8e0, 0x1a1020, 0.9));
    // a theatre spotlight from above, casting the hero's shadow on the stage
    const key = new THREE.SpotLight(0xfff1d0, 70, 14, 0.42, 0.55, 1.2);
    key.position.set(0.6, 6, 2.2);
    key.target.position.set(0, 0.6, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(512, 512);
    key.shadow.bias = -0.0008;
    scene.add(key, key.target);
    // rim and fill lights tinted with the hero's colours
    const rim = new THREE.PointLight(0x7a4bd6, 16, 8, 1.5);
    rim.position.set(-2.2, 2.2, -1.8);
    const rim2 = new THREE.PointLight(0x19c6e6, 10, 8, 1.5);
    rim2.position.set(2.4, 1.4, -1.6);
    scene.add(rim, rim2);
    // round stage: dark marble, gold trim, a glowing ring in the hero's colour
    const marble = new THREE.MeshStandardMaterial({ color: 0x241a2e, roughness: 0.25, metalness: 0.2 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xd9b45a, roughness: 0.3, metalness: 0.85 });
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.3, 0.28, 48), marble);
    ped.position.y = -0.14;
    ped.receiveShadow = true;
    scene.add(ped);
    const trim = new THREE.Mesh(new THREE.TorusGeometry(1.16, 0.035, 8, 64), gold);
    trim.rotation.x = Math.PI / 2;
    trim.position.y = 0.0;
    scene.add(trim);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xd8312e, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.86, 0.98, 64), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.006;
    scene.add(ring);
    const glowTex = makeGlowTexture('#ffffff');
    const floorGlow = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), new THREE.MeshBasicMaterial({ map: glowTex, color: 0xd8312e, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    floorGlow.rotation.x = -Math.PI / 2;
    floorGlow.position.y = 0.004;
    scene.add(floorGlow);
    // sparkles rising from the stage
    const N = 70;
    const sp = new Float32Array(N * 3);
    const seeds = [];
    for (let i = 0; i < N; i++) seeds.push({ a: Math.random() * Math.PI * 2, r: 0.4 + Math.random() * 0.8, y: Math.random() * 2.6, v: 0.25 + Math.random() * 0.5 });
    const spGeo = new THREE.BufferGeometry();
    spGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    const sparkMat = new THREE.PointsMaterial({ map: glowTex, color: 0xffe9a8, size: 0.09, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
    const sparks = new THREE.Points(spGeo, sparkMat);
    scene.add(sparks);
    // two tiny ghosts circle behind the stage
    const orbiters = ['white', 'pink'].map((k, i) => {
      const g = buildGhost(k);
      g.group.scale.setScalar(0.32);
      g.bodyMat.opacity = 0.5;
      scene.add(g.group);
      return { g, phase: i * Math.PI };
    });
    this.preview = { renderer, scene, camera, hero: null, heroId: null, spin: 0, rim, rim2, ringMat, floorGlow, sparks, seeds, orbiters, tint: new THREE.Color(0xd8312e) };
  }

  setPreviewHero(char) {
    const P = this.preview;
    if (P.heroId === char.id) return;
    if (P.holder) P.scene.remove(P.holder);
    P.hero = buildHero(char);
    P.hero.group.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
    P.holder = new THREE.Group();
    P.holder.add(P.hero.group);
    P.scene.add(P.holder);
    P.heroId = char.id;
    P.pop = 0;
    // stage lighting follows the hero's colours
    P.tint.set(char.colors.primary);
    P.ringMat.color.set(char.colors.primary);
    P.floorGlow.material.color.set(char.colors.primary);
    P.rim.color.set(char.colors.primary);
    P.rim2.color.set(char.colors.accent || char.colors.secondary);
    P.sparks.material.color.set(char.colors.light || 0xffe9a8);
  }

  renderPreview(dt) {
    const P = this.preview;
    if (!P.hero) return;
    const t = this.time;
    P.spin += dt * 0.9;
    P.pop = Math.min(1, (P.pop || 0) + dt * 2.6);
    // swap-in: the hero pops up out of the stage with a little hop
    const e = 1 - Math.pow(1 - P.pop, 3);
    P.holder.scale.setScalar(0.4 + 0.6 * e);
    P.holder.position.y = Math.sin(Math.min(1, P.pop * 1.4) * Math.PI) * 0.45;
    P.holder.rotation.y = Math.sin(P.spin) * 0.9 + 0.3 + (1 - e) * Math.PI * 2;
    P.hero.animate(t, 0, dt);
    P.ringMat.opacity = 0.65 + Math.sin(t * 3) * 0.2;
    P.floorGlow.material.opacity = 0.45 + Math.sin(t * 2) * 0.1 + (1 - e) * 0.5;
    const pos = P.sparks.geometry.attributes.position;
    P.seeds.forEach((s, i) => {
      s.y += s.v * dt;
      if (s.y > 2.8) s.y = 0;
      const a = s.a + t * 0.4;
      pos.setXYZ(i, Math.cos(a) * s.r, s.y, Math.sin(a) * s.r);
    });
    pos.needsUpdate = true;
    P.orbiters.forEach((o) => {
      const a = t * 0.6 + o.phase;
      o.g.group.position.set(Math.cos(a) * 1.9, 1.5 + Math.sin(t * 1.7 + o.phase) * 0.25, Math.sin(a) * 1.2 - 1.2);
      o.g.group.rotation.y = -a + Math.PI / 2;
      if (o.g.animate) o.g.animate(t, dt);
    });
    P.renderer.render(P.scene, P.camera);
  }

  // ---------------------------------------------------------------
  buildSelectUI() {
    this.hud.buildSelect(CHARACTERS, {
      onHover: (i) => this.highlight(i),
      onClick: (i) => {
        if (this.selectedIndex === i) this.confirmSelect();
        else this.highlight(i);
      },
    });
    this.highlight(this.selectedIndex, true);
  }

  refreshSelectBadges() {
    this.hud.refreshSelectBadges(CHARACTERS, this.bridge, this.progress);
  }

  highlight(i, silent = false) {
    const n = CHARACTERS.length;
    this.selectedIndex = ((i % n) + n) % n;
    const ch = CHARACTERS[this.selectedIndex];
    this.hud.showSelectedHero(this.selectedIndex, ch, this.bridge, this.progress);
    this.setPreviewHero(ch);
    this.sound.setHero(ch.id); // the highlighted hero hums the waltz on the select screen
    if (!silent) this.sound.blip();
  }

  wireUI() {
    $('boot-start').addEventListener('click', () => this.leaveBoot());
    $('boot').addEventListener('click', (e) => {
      if (e.target.id !== 'boot-start') this.leaveBoot();
    });
    $('select-go').addEventListener('click', () => this.confirmSelect());
    $('select-shop').addEventListener('click', () => this.openWorkshop());
    $('ws-back').addEventListener('click', () => this.closeWorkshop());
    $('ws-list').addEventListener('click', (e) => {
      const li = e.target.closest('li[data-i]');
      if (!li) return;
      const i = Number(li.dataset.i);
      if (i === this.wsIndex) this.buyUpgrade(i);
      else {
        this.wsIndex = i;
        this.sound.blip();
        this.hud.renderWorkshop(this.progress, this.wsIndex);
      }
    });
    $('res-again').addEventListener('click', () => this.afterResults());
  }

  leaveBoot() {
    if (this.state !== State.BOOT) return;
    this.sound.init();
    this.sound.startAmbience();
    this.sound.confirm();
    this.goDataSelect(this.fileIndex);
  }

  showScreen(id) {
    this.hud.showScreen(id);
  }

  goSelect() {
    this.endRun();
    this.setState(State.CHAR_SELECT);
    this.showScreen('select');
    this.hud.show(false);
    this.refreshSelectBadges();
    this.highlight(this.selectedIndex, true);
    requestAnimationFrame(() => this.onResize());
  }

  confirmSelect() {
    if (this.state !== State.CHAR_SELECT) return;
    const ch = CHARACTERS[this.selectedIndex];
    if (!this.progress.isUnlocked(ch.id)) {
      this.sound.blip();
      const info = document.getElementById('hero-info');
      info.classList.remove('shake');
      void info.offsetWidth;
      info.classList.add('shake');
      return;
    }
    this.sound.init();
    this.sound.confirm();
    this.bridge.characterSelected(ch.id);
    this.startRun(ch);
  }

  // ---------------------------------------------------------------
  // WORKSHOP — spend banked treasure on vacuum upgrades
  openWorkshop() {
    if (this.state !== State.CHAR_SELECT) return;
    this.sound.confirm();
    this.setState(State.WORKSHOP);
    this.showScreen('workshop');
    this.hud.renderWorkshop(this.progress, this.wsIndex);
  }

  closeWorkshop() {
    if (this.state !== State.WORKSHOP) return;
    this.sound.blip();
    this.setState(State.CHAR_SELECT);
    this.showScreen('select');
    this.refreshSelectBadges();
    this.highlight(this.selectedIndex, true);
  }

  moveWorkshop(d) {
    const n = UPGRADES.length;
    this.wsIndex = (((this.wsIndex + d) % n) + n) % n;
    this.sound.blip();
    this.hud.renderWorkshop(this.progress, this.wsIndex);
  }

  buyUpgrade(i) {
    const u = UPGRADES[i];
    if (this.progress.buy(u.id)) {
      this.sound.chime('gem');
      this.hud.renderWorkshop(this.progress, i, i);
    } else {
      this.sound.blip();
      this.hud.toast(this.progress.cost(u.id) === null ? `${u.name} is maxed out` : 'Not enough treasure in the bank', 'danger');
    }
  }

  // bank treasure and XP earned since the run started (or since the last checkpoint)
  bankProgress(success, rate) {
    if (!this.runXP) return null;
    const report = this.progress.award({
      heroId: this.char.id,
      cash: Math.max(0, this.cash - this.bankedCash),
      success,
      rate,
      ...this.runXP,
      rescuedId: success ? this.trappedChar.id : null,
    });
    this.bankedCash = this.cash;
    this.runXP = { ghosts: 0, bosses: 0, rooms: 0 };
    for (const id of report.stickers) this.unlock(id);
    return report;
  }

  // ===================================================================
  // RUN LIFECYCLE
  // ===================================================================
  startRun(char, checkpoint = null) {
    if (this.title) this.title.menuReady = false; // the story may relight the outside of the house
    this.renderer.shadowMap.autoUpdate = true; // the select screen pauses shadow updates
    this.endRun();
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020206);
    scene.fog = new THREE.Fog(CONFIG.render.fogColor, CONFIG.render.fogNear, CONFIG.render.fogFar);
    this.scene = scene;

    // pitch-black by default: faint blue moonlight ambience only
    scene.add(new THREE.AmbientLight(0x1c2850, 0.6));
    scene.add(new THREE.HemisphereLight(0x3a4a88, 0x140a08, 0.45));
    const moon = new THREE.DirectionalLight(0x7088e0, 0.55);
    moon.position.set(-12, 22, -30);
    scene.add(moon);

    this.mansion = new Mansion(scene, { lights: this.options.gfx === 'low' ? 8 : 12 });
    this.loot = new LootSystem(scene);
    this.fx = new Effects(scene);
    this.fx.setView(this.renderer.domElement.height, this.camera.fov);
    this.dust = new DustMotes(scene);
    this.char = char;
    this.sound.setHero(char.id);
    this.musicMood = 'dark';
    this.player = new Player(scene, char, this.mansion, this.sound, this.progress.buildStats(char));
    this.player.spawn(this.mansion.spawns.player, Math.PI);
    // Low graphics: the flashlight stops casting shadows (saves a full extra render pass)
    this.player.spot.castShadow = this.options.gfx !== 'low';

    const cleared = new Set(checkpoint ? checkpoint.cleared || [] : []);
    this.ghosts = [];
    this.bosses = [];
    this.tutorialGhost = null;
    for (const [roomId, def] of Object.entries(ROOM_DEFS)) {
      if (cleared.has(roomId)) continue;
      for (const spec of def.ghosts || []) {
        if (spec.tutorial) {
          this.tutorialGhost = new Ghost(scene, { kind: 'gold', room: roomId, spawn: new THREE.Vector3(spec.x, CONFIG.ghost.floatHeight, spec.z), autoAppear: false, damage: 6, value: 1500, forgiving: true, loot: { coin: 5, bill: 1, heart: 0.5 } });
          this.ghosts.push(this.tutorialGhost);
        } else {
          this.ghosts.push(this.makeGhost(roomId, spec, def.area || 1));
        }
      }
      if (def.boss) {
        let b;
        if (def.boss === 'grumbleclaw') b = new BossGhost(scene, { room: roomId, seat: this.mansion.spawns.bossSeat });
        else b = new PortraitGhost(scene, { id: def.boss, room: roomId, spot: this.mansion.bossSpots[def.boss] });
        this.bosses.push(b);
        this.ghosts.push(b);
      }
    }
    this.parlorGhosts = this.ghosts.filter((g) => g.room === ROOM_IDS.PARLOR);

    // Boos wait outside until their room's lights come on
    this.boosCaught = new Set(checkpoint ? checkpoint.boos || [] : []);
    this.boos = [];
    for (const b of BOOS) {
      if (!ROOM_DEFS[b.room] || this.boosCaught.has(b.id)) continue;
      const area = ROOM_DEFS[b.room].area || 1;
      const boo = new Boo(scene, { id: b.id, name: b.name, room: b.room, area, value: 5000 + area * 1000 });
      this.boos.push(boo);
      this.ghosts.push(boo);
    }
    this.booTotal = BOOS.filter((b) => ROOM_DEFS[b.room]).length;
    this.booTips = { lit: false, out: false };
    this.booBeepTimer = 0;
    this.booLed = 0;
    this.booAnnounced = new Set();

    // Speedy Spirits slip into a random piece of furniture in their dark room
    this.speediesCaught = new Set(checkpoint ? checkpoint.speedies || [] : []);
    this.speedies = [];
    this.speedyTipShown = false;
    for (const s of SPEEDIES) {
      if (!ROOM_DEFS[s.room] || cleared.has(s.room) || this.speediesCaught.has(s.id)) continue;
      const spirit = new SpeedySpirit(scene, { id: s.id, room: s.room, area: ROOM_DEFS[s.room].area || 1 });
      const spot = this.findSpeedySpot(spirit, null);
      if (!spot) continue;
      spirit.hideIn(spot);
      this.speedies.push(spirit);
      this.ghosts.push(spirit);
    }

    // a fellow WIDR 64 teammate is trapped in the cursed painting
    if (checkpoint && checkpoint.trapped && getCharacter(checkpoint.trapped).id === checkpoint.trapped) {
      this.trappedChar = getCharacter(checkpoint.trapped);
    } else {
      const others = CHARACTERS.filter((c) => c.id !== char.id);
      // locked heroes are trapped first, so every rescue frees someone new
      const locked = others.filter((c) => !this.progress.isUnlocked(c.id));
      const notRescued = others.filter((c) => !this.bridge.data.rescued.includes(c.id));
      const pool = locked.length ? locked : notRescued.length ? notRescued : others;
      this.trappedChar = pool[Math.floor(Math.random() * pool.length)];
    }
    this.mansion.setupTrappedPainting(this.trappedChar, () => this.onTeammateFreed());

    this.cash = checkpoint ? checkpoint.cash || 0 : 0;
    // progression: checkpoint treasure is already in the bank
    this.bankedCash = this.cash;
    this.runXP = { ghosts: 0, bosses: 0, rooms: 0 };
    this.ghostsCaught = checkpoint ? checkpoint.ghostsCaught || 0 : 0;
    this.runTime = checkpoint ? checkpoint.runTime || 0 : 0;
    this.area = checkpoint ? checkpoint.area || 0 : 0;
    this.tutorialStep = this.tutorialGhost ? 0 : 5;
    this.movedDist = 0;
    this.visited = new Set([ROOM_IDS.FOYER]);
    this.currentRoomId = ROOM_IDS.FOYER;
    this.currentLevel = '1F';
    this.tipTimer = 0;
    this.styleTips = {};
    this.newStickers = [];
    this.success = false;
    this.downTimer = 0;
    this.freedTimer = 0;
    this.catsFound = !!(checkpoint && checkpoint.secrets && checkpoint.secrets.cats);
    this.parlorAnnounced = false;
    this.clearedRooms = new Set();
    this.transition = null;
    this.pendingCheckpoint = 0;
    this.saveMode = 'final';
    // key ring: door name → key label. Keys rise out of reward chests and
    // are used up when you walk into their locked door.
    this.keys = new Map(checkpoint && checkpoint.keys ? checkpoint.keys : []);
    this.usedKeys = new Set(checkpoint ? checkpoint.usedKeys || [] : []);
    this.keyItems = [];
    this.elements = new ElementSystem(this, checkpoint ? checkpoint.candleSets || [] : []);
    // scattered teammates waiting in the mansion with quests
    this.quests = new QuestSystem(this, checkpoint ? checkpoint.quests : null);
    this.swapCooldown = 0;
    this.quests.renderTracker();
    if (checkpoint && checkpoint.secrets && checkpoint.secrets.lawrence) this.mansion.lawrence.found = true;
    for (const roomId of cleared) if (ROOM_DEFS[roomId]) this.onRoomCleared(roomId, true);
    if (checkpoint && checkpoint.hp) this.player.hp = Math.min(this.player.maxHp, Math.max(30, checkpoint.hp));

    this.hud.setCharacter(char);
    this.refreshTeamBar();
    this.hud.show(true);
    this.hud.setFade(0);
    this.showScreen(null);
    this.rig.resetBounds();
    this.rig.snap(this.player.pos);
    this.rig.update(0.016, this.player.pos, this.player.facingDir, this.mansion.rooms[ROOM_IDS.FOYER]);
    this.setState(State.PLAYING);
    this.renderer.domElement.focus();
    this.sound.startAmbience();

    if (checkpoint) {
      this.showTip(`Welcome back, <b>${char.name}</b>! Your progress through <b>Area ${this.area}</b> was restored. ${this.nextGoalHint()}`, 8);
    } else {
      // arrival cutscene first; the movement tutorial follows it
      const welcome = () => this.hud.tutorial(`Welcome to the WIDR 64 Mansion, <b>${char.name}</b>! ` + this.btn(
        'Move with <b>WASD</b> (aim with the mouse) or the <b>ARROW KEYS</b>.',
        'Move with the <b>LEFT STICK</b> and point your light with the <b>RIGHT STICK</b>.'));
      if (!this.cutscene.playNow(openingScene(this), { onEnd: welcome })) welcome();
    }
    if (char.id === 'lars') this.unlock('cats');
    this.bridge.scoreUpdate(this.cash, rankFor(this.cash), this.ghostsCaught, true);
  }

  // build a regular ghost for a room, scaled to the area's difficulty
  makeGhost(roomId, spec, area) {
    const type = GHOST_TYPES[spec.kind] || GHOST_TYPES.gold;
    const hp = (AREA_HP[area] || 100) + (type.hpBonus || 0);
    const value = Math.round((type.value * (AREA_VALUE[area] || 1)) / 50) * 50;
    return new Ghost(this.scene, {
      kind: spec.kind, room: roomId, spawn: new THREE.Vector3(spec.x, CONFIG.ghost.floatHeight, spec.z), hp,
      damage: Math.round((type.damage || CONFIG.ghost.attackDamage) * (1 + (area - 1) * 0.1)), value,
      dodgy: !!type.dodgy, speedMult: (type.speedMult || 1) * (1 + (area - 1) * 0.05), loot: type.loot, style: type.style || 'lunge', element: type.element || null,
    });
  }

  // Master Varnish calls his apprentices mid-fight
  spawnMinions(boss, n) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random();
      const spec = { kind: i % 2 ? 'white' : 'pink', x: boss.roamCenter.x + Math.cos(a) * 4, z: boss.roamCenter.z + Math.sin(a) * 3 };
      const g = this.makeGhost(boss.room, spec, 5);
      this.ghosts.push(g);
      g.appear(this);
    }
    this.hud.toast('🎨 Master Varnish painted ghost apprentices to life!', 'danger');
  }

  endRun() {
    if (!this.scene) return;
    if (this.player) this.player.dispose();
    if (this.bosses) this.bosses.forEach((b) => b.dispose());
    if (this.loot) this.loot.clear();
    if (this.elements) this.elements.dispose();
    if (this.quests) this.quests.dispose();
    this.quests = null;
    if (this.fx) this.fx.clear();
    if (this.cutscene) this.cutscene.clear();
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
    this.scene = null;
    this.player = null;
    this.bosses = [];
    this.sound.setVacuum(false);
    this.sound.setTug(false);
    this.sound.setFire(0);
    this.sound.setTension(0);
  }

  unlock(id) {
    if (this.bridge.unlockSticker(id)) {
      this.newStickers.push(id);
      this.hud.toast('STICKER UNLOCKED: ' + this.bridge.stickerLabel(id), 'sticker');
    }
  }

  showTip(html, seconds = 5) {
    this.hud.tutorial(html);
    this.tipTimer = seconds;
  }

  // ---------------------------------------------------------------
  // TEAM — switch to the next hero who has joined (T / pad B)
  teamList() {
    return CHARACTERS.filter((c) => this.progress.isUnlocked(c.id) || c.id === this.char.id);
  }

  swapHero() {
    const p = this.player;
    if (!p || this.state !== State.PLAYING || this.transition || this.cutscene.active) return;
    const team = this.teamList();
    if (team.length < 2) {
      this.hud.toast('No one to switch to yet. Help your scattered teammates with their quests and they\'ll join you!', 'info');
      return;
    }
    if (p.latched || p.hp <= 0) {
      this.hud.toast('Can\'t switch heroes in the middle of a tug-of-war!', 'danger');
      return;
    }
    if (this.swapCooldown > 0) return;
    const next = team[(team.findIndex((c) => c.id === this.char.id) + 1) % team.length];
    const pos = p.pos.clone();
    const facing = p.facing;
    const ratio = p.hp / p.maxHp;
    const lightOn = p.lightOn;
    p.dispose();
    this.char = next;
    this.sound.setHero(next.id);
    this.player = new Player(this.scene, next, this.mansion, this.sound, this.progress.buildStats(next));
    this.player.spawn(pos, facing);
    this.player.hp = Math.max(1, Math.round(ratio * this.player.maxHp));
    this.player.lightOn = lightOn;
    this.player.spot.castShadow = this.options.gfx !== 'low';
    this.hud.setCharacter(next);
    this.fx.puff(pos.clone().setY(0.8), 0xe8f0ff, 18);
    this.fx.sparkle(pos.clone().setY(1.2), next.colors.primary, 26);
    this.sound.confirm();
    this.swapCooldown = 1.2;
    this.hud.toast(`🔄 ${next.name} takes over! ${next.passive.name}: ${next.passive.text}`, 'info');
    if (next.id === 'lars') this.unlock('cats');
    this.refreshTeamBar();
  }

  // little portraits of the team in the HUD, current hero highlighted
  refreshTeamBar() {
    const el = document.getElementById('team-bar');
    if (!el || !this.char) return;
    const team = this.teamList();
    el.classList.toggle('hidden', team.length < 2);
    if (team.length < 2) return;
    el.innerHTML = '';
    for (const c of team) {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 40;
      cv.title = c.name;
      cv.className = c.id === this.char.id ? 'active' : '';
      drawPortrait(cv.getContext('2d'), 40, c);
      el.appendChild(cv);
    }
    const hint = document.createElement('span');
    hint.className = 'tb-hint';
    hint.innerHTML = this.btn('<kbd>T</kbd> switch', '<kbd>B</kbd> switch');
    el.appendChild(hint);
  }

  addCash(v) {
    this.cash += v;
    if (this.quests) this.quests.onCash(v);
    this.bridge.scoreUpdate(this.cash, rankFor(this.cash), this.ghostsCaught);
  }

  // ===================================================================
  // ROOM PROGRESSION — clear every ghost in a room: lights come up, a
  // treasure chest appears, and the room's key / reward is handed out.
  // ===================================================================
  checkRoomCleared(roomId) {
    if (this.clearedRooms.has(roomId)) return;
    const def = ROOM_DEFS[roomId];
    if (!def || (!(def.ghosts || []).length && !def.boss)) return;
    if (this.ghosts.some((g) => g.alive && !g.bonus && g.room === roomId)) return;
    this.onRoomCleared(roomId);
  }

  onRoomCleared(roomId, silent = false) {
    if (!silent && this.runXP && !this.clearedRooms.has(roomId)) this.runXP.rooms++;
    this.clearedRooms.add(roomId);
    const def = ROOM_DEFS[roomId];
    const rw = def.reward || {};
    this.mansion.setRoomLit(roomId, silent);
    for (const [id, d] of Object.entries(ROOM_DEFS)) {
      if (d.litWith === roomId) {
        this.mansion.setRoomLit(id, silent);
        this.clearedRooms.add(id);
      }
    }
    // the first door listed is opened by a physical key from the room's chest;
    // any others (like the Crypt) creak open straight away
    const keyDoor = rw.key && (rw.unlock || [])[0];
    for (const name of rw.unlock || []) {
      const door = this.mansion.doors[name];
      if (!door) continue;
      if (name !== keyDoor) door.unlock();
      else if (silent) {
        // restoring a save: used keys stay used, the rest go back on the ring
        if (this.usedKeys.has(name)) door.unlock();
        else if (!this.keys.has(name)) this.keys.set(name, rw.key);
      }
    }
    for (const id of rw.portals || []) this.mansion.unlockPortal(id);
    if (rw.area) this.area = Math.max(this.area, rw.area);
    // the waltz bursts into its bright D-major version when the lights come on
    if (!silent && roomId === this.currentRoomId) this.sound.musicLightsOn();
    this.activateBoos(roomId, silent);
    // Speedy Spirits can't stand the light
    for (const s of this.speedies || []) {
      if (s.alive && s.room === roomId && s.state !== 'tug' && s.state !== 'captured') s.vanishForever(this, !silent && roomId === this.currentRoomId);
    }

    if (silent) {
      // restoring a checkpoint: chests already opened, rewards already earned
      for (const it of this.mansion.interactables) {
        if (it.kind !== 'chest' || it.room !== roomId) continue;
        it.hidden = false;
        it.popT = 1;
        it.object.visible = true;
        if (it.collider) it.collider.enabled = true;
        it.searched = true;
        it.lidAngle = 1.9;
        it.lid.rotation.x = -1.9;
        if (it.glow) it.glow.material.opacity = 0;
      }
      if (roomId === ROOM_IDS.BEDROOM) this.mansion.snoozeAwake = true;
      return;
    }

    this.mansion.revealChests(roomId, this);
    this.sound.unlock();
    // big passages opening elsewhere get their own cutscene (after the capture fanfare)
    if ((rw.portals || []).includes('stairsL')) this.cutscene.enqueue(stairsScene(this), { delay: 3.2 });
    if ((rw.portals || []).includes('cellar')) this.cutscene.enqueue(cellarScene(this), { delay: 2.4 });
    if ((rw.unlock || []).includes('crypt')) this.cutscene.enqueue(cryptScene(this), { delay: 3.2 });
    // every area boss closes a chapter: cut outside and watch that part of the house light up
    if (rw.area && chapterScene(this, rw.area)) this.cutscene.enqueue(chapterScene(this, rw.area), { delay: 4.6 });
    if (keyDoor) {
      // tuck the key into the room's chest; it pops out when the chest opens
      const chest = this.mansion.interactables.find((it) => it.kind === 'chest' && it.room === roomId);
      const item = { door: keyDoor, label: rw.key, tip: rw.tip };
      if (chest && !chest.searched) chest.keyItem = item;
      else this.spawnKey(this.player.pos.clone().setY(1.2), item);
      this.hud.toast('🗝️ Something is jingling inside the treasure chest...', 'info');
      if (rw.sticker) this.unlock(rw.sticker);
    } else {
      if (rw.sticker) this.unlock(rw.sticker);
      if (rw.tip) this.showTip(rw.tip, 8);
    }
    if (roomId === ROOM_IDS.OBSERVATORY) {
      const p = new THREE.Vector3(22, 2.5, -116);
      this.loot.spawn(p, { gem: 2, pearl: 2, bill: 3 }, this.player.stats.luck, 1.1);
      this.fx.sparkle(p, 0xffe68c, 30);
    }
    if (roomId === ROOM_IDS.BALLROOM) {
      this.mansion.revealTrappedPainting();
      const pp = this.mansion.trapped.worldCenter();
      this.rig.focusOn(pp.clone().setY(0).add(new THREE.Vector3(0, 0, 3)), 2.6);
      this.sound.victory();
      this.showTip(`The cursed painting! <b>${this.trappedChar.name}</b> is trapped inside. Aim your <b>vacuum</b> at it to break the curse!`, 10);
    }
    if (rw.area) {
      this.hud.toast(`⭐ AREA ${rw.area} CLEARED!`, 'info');
      this.pendingCheckpoint = 3.2;
    }
    const total = Object.values(ROOM_DEFS).filter((d) => (d.ghosts || []).length || d.boss).length;
    const done = [...this.clearedRooms].filter((id) => ROOM_DEFS[id] && ((ROOM_DEFS[id].ghosts || []).length || ROOM_DEFS[id].boss)).length;
    if (done >= total) this.unlock('full_clear');
  }

  // where to go next (used when resuming a save)
  nextGoalHint() {
    const hints = {
      0: 'Catch the ghost in the Foyer to begin.',
      1: 'The <b>West Wing</b> door at the west end of the Hallway is open.',
      2: 'The <b>Foyer stairs</b> lead to the second floor.',
      3: 'The <b>East Wing</b> door at the east end of the Hallway is open.',
      4: 'The <b>Kitchen</b> (via the East Hall) leads to the Ballroom.',
    };
    return hints[this.area] || '';
  }

  // ===================================================================
  // FLOOR TRANSITIONS — staircases and the cellar trapdoor
  // ===================================================================
  usePortal(p) {
    if (this.transition) return;
    this.transition = { t: 0, portal: p, swapped: false };
    this.sound.creak();
    this.sound.setVacuum(false);
    this.hud.prompt(null);
  }

  updateTransition(dt) {
    const tr = this.transition;
    tr.t += dt;
    const out = 0.45;
    if (tr.t < out) {
      this.hud.setFade(tr.t / out);
    } else if (!tr.swapped) {
      tr.swapped = true;
      const to = tr.portal.to;
      this.player.spawn(new THREE.Vector3(to.x, 0, to.z), to.facing);
      this.player.vel.set(0, 0, 0);
      const room = this.mansion.rooms[to.room];
      this.onEnterRoom(room);
      this.rig.resetBounds();
      this.rig.snap(this.player.pos);
      this.rig.update(0.016, this.player.pos, this.player.facingDir, room);
      this.hud.setFade(1);
      for (let i = 0; i < 3; i++) setTimeout(() => this.sound.footstep(0.6, false, 0.5), 120 + i * 160);
    } else {
      const k = 1 - (tr.t - out - 0.15) / 0.5;
      this.hud.setFade(Math.max(0, Math.min(1, k)));
      if (k <= 0) this.transition = null;
    }
    this.mansion.update(dt, this.time, this.player.pos, this.camera, this.currentRoomId);
    this.rig.update(dt, this.player.pos, this.player.facingDir, this.mansion.rooms[this.currentRoomId]);
  }

  // ===================================================================
  // EVENTS (called by entities)
  // ===================================================================
  onFootstep(player) {
    if (player.stats.noise > 0.6 && Math.random() < 0.5) this.fx.footDust(player.pos);
  }

  // surge: switching the light on with a full charge
  onFlash(player) {
    this.postfx.punch = 1;
    this.hud.screenFlash(0.35);
    const shock = player.stats.shockRadius;
    if (shock > 0) {
      this.fx.ring(player.pos, 0xffa040, shock);
      this.fx.spark(player.pos.clone().setY(1), 0xffa040, 10);
      this.rig.shake(0.2);
      this.sound.explosionPop();
    }
    const eye = player.pos.clone().setY(1.2);
    for (const g of this.ghosts) {
      if (!g.alive || g.room !== this.currentRoomId) continue;
      const d = Math.hypot(g.pos.x - player.pos.x, g.pos.z - player.pos.z);
      const inCone = player.inFlashCone(g.pos) && this.mansion.lineOfSight(eye, g.pos);
      const inShock = shock > 0 && d < shock;
      if ((inCone || inShock) && g.tryStun(player, this, true)) this.rig.shake(g.isBoss ? 0.45 : 0.3);
    }
  }

  // steady beam: every frame the light is on, ghosts caught in it with their
  // heart showing are stunned, and hidden secrets are revealed
  onBeam(player, dt) {
    const eye = player.pos.clone().setY(1.2);
    for (const g of this.ghosts) {
      if (!g.alive || g.room !== this.currentRoomId || !g.visible) continue;
      if (!player.inFlashCone(g.pos) || !this.mansion.lineOfSight(eye, g.pos)) continue;
      if (g.tryStun(player, this, false, dt)) {
        this.rig.shake(g.isBoss ? 0.45 : 0.3);
        this.hud.screenFlash(0.18);
      }
    }
    // Lawrence's secret portrait only shows itself in a full-charge surge
    const law = this.mansion.lawrence;
    if (law && !law.found && player.flashBurst > 0 && this.currentRoomId === ROOM_IDS.HALLWAY && player.inFlashCone(law.pos, 1.4)) {
      law.found = true;
      this.fx.sparkle(law.pos.clone().setY(2.2), 0x7dffb0, 20);
      this.sound.chime('gem');
      this.hud.toast("🪨 Secret portrait: LAWRENCE, Fionn's evolution!", 'info');
      this.unlock('secret_lawrence');
      this.loot.spawn(law.pos.clone().setY(1.5), { gem: 1, pearl: 1 }, 1, 0.6);
    }
    const cats = this.mansion.catsPortraitPos;
    if (cats && this.currentRoomId === ROOM_IDS.FOYER && player.inFlashCone(cats, 1.3) && Math.hypot(cats.x - player.pos.x, cats.z - player.pos.z) < 7) {
      if (!this.catsFound) {
        this.catsFound = true;
        this.hud.toast('🐈 Kayo & Yara say meow!', 'info');
        this.unlock('cats');
      }
    }
  }

  // element ghosts report back here; the element system keeps the tips
  onElementImmune(g) {
    this.elements.onImmune(g);
  }

  onElementFed(g, type) {
    this.elements.onFed(g, type);
  }

  onElementStun(g, type) {
    this.elements.onStun(g, type);
    if (this.quests) this.quests.onElementStun();
  }

  onGhostAppeared(g) {
    this.rig.shake(0.15);
    // first meeting with a ghost that fights differently
    this.styleTips = this.styleTips || {};
    if (g.style === 'punch' && !this.styleTips.punch) {
      this.styleTips.punch = true;
      this.showTip('A <b>Purple Puncher</b>! It winds up a giant fist — and its heart only shows <b>after the swing</b>, while it\'s dizzy. Dodge the punch, then light it up!', 8);
    } else if (g.style === 'throw' && !this.styleTips.throw) {
      this.styleTips.throw = true;
      this.showTip('A <b>Tossing Ghost</b>! It keeps its distance and hurls books and vases. Its heart shows while it <b>lifts something overhead</b> and right after the throw.', 8);
    } else if (g.element && !this.styleTips[g.element]) {
      this.styleTips[g.element] = true;
      const how = {
        fire: 'Your light can\'t touch it — douse it with <b>💧 WATER</b> from a sink or tub.',
        water: 'Your light can\'t touch it — freeze it with <b>❄️ ICE</b> from an ice bucket.',
        ice: 'Your light can\'t touch it — thaw it with <b>🔥 FIRE</b> from a fireplace, brazier or candle.',
      }[g.element];
      this.showTip(`A <b>${g.name}</b>! ${how} Point the vacuum at the source to suck it up, then ${this.btn('hold <kbd>Q</kbd>', 'hold <kbd>Y</kbd>')} to spray.`, 9);
    }
    if (g === this.tutorialGhost) {
      this.tutorialStep = 2;
      this.hud.tutorial('A ghost! Keep your <b>flashlight</b> on it — the moment its <b>heart</b> shows, the light stuns it. ' +
        this.btn('<b>CLICK</b> / <b>SPACE</b> / <b>Z</b>', '<b>LT</b> / <b>X</b>') + ' switches the light off and on.');
    } else if (this.parlorGhosts.includes(g) && !this.parlorAnnounced) {
      this.parlorAnnounced = true;
      this.hud.toast('👻 Ghosts in the Parlor!', 'danger');
      this.showTip('Ghosts dodge your beam. Their <b>heart</b> only shows when they <b>attack</b> or laugh — catch them in the light then. Switch the light <b>off</b> to lure them in, and watch your back!', 7);
    }
  }

  onBossIntro(boss) {
    this.rig.focusOn(boss.pos.clone().setY(0), 2.4);
    this.sound.bossRoar();
    this.rig.shake(0.4);
    if (boss.profile) {
      this.hud.toast(boss.profile.intro, 'danger');
      this.showTip(boss.profile.tip, 10);
    } else {
      this.hud.toast('GRUMBLECLAW from The Guiseppe Game is feasting!', 'danger');
      this.showTip('Watch him eat: right after a big <b>CHOMP</b> he shuts his eyes — shine your light on him then! Keep it <b>off</b> between bites, and when he <b>looks up</b>, stand perfectly still.', 9);
    }
  }

  onDoorOpened(door) {
    const toward = new THREE.Vector3(door.center.x - this.player.pos.x, 0, door.center.z - this.player.pos.z).normalize();
    this.rig.focusOn(door.center.clone().addScaledVector(toward, 3), CONFIG.camera.doorPanTime);
  }

  // a second / third stunned ghost got dragged into the current pull
  onGhostJoinedTug(g, group) {
    this.hud.toast(group >= 3 ? '👻👻👻 TRIPLE PULL! Hold on tight!' : '👻👻 DOUBLE PULL! Reel them both in!', 'info');
    this.fx.sparkle(g.pos, g.model.color, 12);
  }

  // ===================================================================
  // KEYS — rise out of reward chests, float to the hero, and open their
  // locked door the moment you walk up to it
  // ===================================================================
  spawnKey(origin, item) {
    if (!this.scene || this.state === State.BOOT) return;
    const mesh = buildKey();
    mesh.position.copy(origin);
    this.scene.add(mesh);
    this.keyItems.push({ mesh, item, t: 0, base: origin.clone() });
    this.sound.keyJingle();
    this.fx.sparkle(origin, 0xffd23a, 24);
    this.fx.ring(origin.clone().setY(0.1), 0xffd23a, 1.8);
  }

  updateKeys(dt) {
    const p = this.player.pos;
    for (let i = this.keyItems.length - 1; i >= 0; i--) {
      const k = this.keyItems[i];
      k.t += dt;
      const m = k.mesh;
      const rise = Math.min(1, k.t / 0.6);
      const hoverY = k.base.y + 0.9 * rise + Math.sin(k.t * 3) * 0.12;
      const d = Math.hypot(m.position.x - p.x, m.position.z - p.z);
      if (k.t > 0.8 && d < 3) {
        // drifts toward the hero once it has finished rising
        m.position.x += (p.x - m.position.x) * Math.min(1, dt * 5);
        m.position.z += (p.z - m.position.z) * Math.min(1, dt * 5);
        m.position.y += (1.4 - m.position.y) * Math.min(1, dt * 5);
      } else {
        m.position.y = hoverY;
      }
      m.rotation.y += dt * 3;
      if (k.t > 0.8 && d < 0.9) {
        this.scene.remove(m);
        this.keyItems.splice(i, 1);
        this.collectKey(k.item);
      }
    }
  }

  collectKey(item) {
    this.keys.set(item.door, item.label);
    this.sound.keyJingle();
    this.sound.chime('gem');
    this.fx.sparkle(this.player.pos.clone().setY(1.6), 0xffd23a, 20);
    this.hud.toast(`🗝️ Got the ${item.label.toUpperCase()} KEY!`, 'info');
    if (item.tip) this.showTip(item.tip, 8);
  }

  // called by a locked door the hero bumps into
  useKey(door) {
    const label = this.keys.get(door.name);
    if (!label) return false;
    this.keys.delete(door.name);
    this.usedKeys.add(door.name);
    const keyDoors = Object.values(ROOM_DEFS).filter((d) => d.reward && d.reward.key && (d.reward.unlock || []).length).length;
    if (this.usedKeys.size >= keyDoors) this.unlock('key_master');
    // the key-turning cutscene unlocks and opens the door itself
    if (this.cutscene.playNow(doorScene(this, door, label))) return true;
    door.unlock();
    this.sound.unlock();
    this.sound.keyJingle();
    this.fx.sparkle(door.center.clone().setY(1.6), 0xffd23a, 22);
    this.hud.toast(`🗝️ The ${label} key turns in the lock!`, 'info');
    return true;
  }

  // ===================================================================
  // BOOS — hide in the furniture of lit rooms; the Game Boy Horror beeps
  // faster the closer you are. Search the right piece to flush one out.
  // ===================================================================
  activateBoos(roomId, silent) {
    for (const boo of this.boos) {
      if (boo.state !== 'dormant' || boo.room !== roomId) continue;
      // a room with nothing to hide in sends its Boo to a lit neighbour
      const spot = this.findBooSpot(boo, null, false) || this.findBooSpot(boo, null, true, true);
      if (!spot) continue;
      boo.hideIn(spot);
      if (!silent && !this.booTips.lit) {
        this.booTips.lit = true;
        this.showTip('📟 Beep... beep... With the lights on, a <b>Boo</b> has crept into the furniture! Follow the <b>Koç Radar</b> — it beeps faster the closer you get — then <b>search</b> the right piece.', 9);
      }
    }
  }

  // a free piece of furniture in a lit room for a Boo to hide in
  findBooSpot(boo, exclude = null, allowMove = false, forceMove = false) {
    const M = this.mansion;
    const free = (it) => it.kind === 'furniture' && it !== exclude && !it.booHide && !it.booReserved && M.rooms[it.room] && M.rooms[it.room].lit;
    let roomId = boo.room;
    const here = M.rooms[boo.room];
    if (here && allowMove && (forceMove || Math.random() < 0.35)) {
      const hx = (here.minX + here.maxX) / 2;
      const hz = (here.minZ + here.maxZ) / 2;
      const near = Object.values(M.rooms).filter((r) => r.id !== boo.room && r.lit && r.level === here.level &&
        Math.hypot((r.minX + r.maxX) / 2 - hx, (r.minZ + r.maxZ) / 2 - hz) < 26 && M.interactables.some((it) => it.room === r.id && free(it)));
      if (near.length) roomId = near[Math.floor(Math.random() * near.length)].id;
    }
    const spots = M.interactables.filter((it) => it.room === roomId && free(it));
    return spots.length ? spots[Math.floor(Math.random() * spots.length)] : null;
  }

  onBooReleased(boo) {
    this.hud.toast(`😝 ${boo.name} the Boo popped out!`, 'danger');
    if (!this.booTips.out) {
      this.booTips.out = true;
      this.showTip('Boos <b>hide their faces</b> from your light. Keep the beam on one until it <b>PEEKS</b> — or turn your back, let it swoop, and light it up while it <b>laughs</b>!', 9);
    }
  }

  onBooFled(boo, movedRoom) {
    if (movedRoom) this.hud.toast(`👻 ${boo.name} fled to the ${this.mansion.rooms[boo.room].name}!`, 'info');
  }

  // ===================================================================
  // SPEEDY SPIRITS — rare treasure ghosts hiding in dark rooms
  // ===================================================================
  findSpeedySpot(spirit, exclude = null) {
    const p = this.player ? this.player.pos : null;
    const spots = this.mansion.interactables.filter((it) => it.kind === 'furniture' && it.room === spirit.room && it !== exclude && !it.booHide && !it.booReserved);
    if (!spots.length) return null;
    // prefers somewhere away from the hero
    const far = p ? spots.filter((it) => { const c = it.worldCenter(); return Math.hypot(c.x - p.x, c.z - p.z) > 4; }) : spots;
    const pool = far.length ? far : spots;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  onSpeedyReleased() {
    this.hud.toast('💎 A SPEEDY SPIRIT! Catch it before it gets away!', 'info');
    if (!this.speedyTipShown) {
      this.speedyTipShown = true;
      this.showTip('Speedy Spirits never attack — <b>any beam</b> stuns them, if you can keep up. They\'re loaded with treasure, but they vanish for good once this room\'s <b>lights come on</b>!', 8);
    }
  }

  onSpeedyCaught(spirit) {
    this.speediesCaught.add(spirit.speedyId);
    this.unlock('speedy_spirit');
    this.sound.chime('gem');
    this.fx.sparkle(spirit.pos.clone().setY(1.4), 0x9ad8ff, 30);
    this.hud.toast(`💎 Speedy Spirit caught! +$${spirit.value.toLocaleString('en-US')} and a shower of treasure!`, 'info');
    if (this.speediesCaught.size >= SPEEDIES.length) this.unlock('speedy_all');
  }

  onBooCaught(boo) {
    this.boosCaught.add(boo.booId);
    this.unlock('first_boo');
    const n = this.boosCaught.size;
    this.hud.toast(`😝 Caught ${boo.name}! BOOS ${n}/${this.booTotal}`, 'info');
    if (n >= this.booTotal) {
      this.addCash(BOO_BUSTER_BONUS);
      this.sound.victory();
      this.rig.shake(0.4);
      this.unlock('boo_buster');
      this.showTip(`📟 Every Boo in the mansion is caught! <b>+$${BOO_BUSTER_BONUS.toLocaleString('en-US')}</b> bonus!`, 7);
    }
  }

  // Game Boy Horror: beeps faster and higher the closer you get to a hidden Boo
  updateBooRadar(dt) {
    this.booLed = Math.max(0, this.booLed - dt);
    this.booCloseness = 0;
    let best = Infinity;
    for (const boo of this.boos) {
      if (!boo.alive || boo.state !== 'hiding' || boo.room !== this.currentRoomId || !boo.hideSpot) continue;
      const c = boo.hideSpot.worldCenter();
      best = Math.min(best, Math.hypot(c.x - this.player.pos.x, c.z - this.player.pos.z));
      if (!this.booAnnounced.has(boo.room + boo.booId)) {
        this.booAnnounced.add(boo.room + boo.booId);
        this.hud.toast('📟 The Koç Radar is beeping... a Boo is hiding in here!', 'info');
      }
    }
    if (best === Infinity || this.player.latched) {
      this.booBeepTimer = 0;
      return;
    }
    const close = 1 - Math.min(1, best / 16);
    this.booCloseness = close;
    this.booBeepTimer -= dt;
    if (this.booBeepTimer <= 0) {
      this.booBeepTimer = THREE.MathUtils.clamp(0.12 + best * 0.075, 0.12, 1.3);
      this.sound.radarBeep(close);
      this.booLed = 0.08;
    }
  }

  onGhostCaptured(g) {
    this.ghostsCaught++;
    if (this.quests) this.quests.onCapture(g);
    if (this.runXP) {
      this.runXP.ghosts++;
      if (g.isBoss) this.runXP.bosses++;
    }
    if (this.elements) this.elements.onCaptured(g);
    // catching several ghosts in one continuous pull multiplies the payout
    const idx = Math.min(g.comboIndex || 1, CONFIG.vacuum.comboCash.length);
    const mult = CONFIG.vacuum.comboCash[idx - 1];
    const value = Math.round(g.value * mult);
    this.addCash(value);
    const origin = g.pos.clone().setY(1.2);
    this.fx.puff(origin, g.model.color, 24);
    this.fx.sparkle(origin, 0xffffff, 16);
    if (this.player.char.id === 'daniel') {
      this.fx.explosion(origin);
      this.sound.explosionPop();
      this.rig.shake(0.45);
    }
    if (idx >= 2) {
      // bonus treasure burst: bills for a double, plus a gem for a triple
      this.loot.spawn(origin, idx >= 3 ? { bill: 6, pearl: 2, gem: 1 } : { bill: 4, pearl: 1 }, this.player.stats.luck, 1);
      this.fx.stars(origin, 0xffd84a);
      this.sound.combo(idx);
      this.rig.shake(0.2 + idx * 0.1);
      this.unlock(idx >= 3 ? 'triple_catch' : 'double_catch');
      if (idx >= 3) this.unlock('double_catch');
      this.hud.toast(`${idx >= 3 ? 'TRIPLE' : 'DOUBLE'} CATCH! ${g.name} ×${mult} +$${value.toLocaleString('en-US')}`, 'info');
    } else if (!g.bonus) {
      this.hud.toast(`Captured ${g.name}! +$${value.toLocaleString('en-US')}${g.onePull ? ' — ONE PULL! Bonus pearl' : ''}`, 'info');
    }
    if (g.isBoo) this.onBooCaught(g);
    if (g.isSpeedy) this.onSpeedyCaught(g);
    this.unlock('first_capture');
    if (g === this.tutorialGhost) this.tutorialStep = 5;
    if (g.isBoss) {
      this.hud.setBoss(null);
      this.sound.victory();
      this.framePortrait(g);
    }
    this.checkRoomCleared(g.room);
  }

  // hits taken inside a boss's room count against its portrait frame
  onPlayerHit() {
    this.postfx.hurt = 1;
    for (const b of this.bosses || []) {
      if (b.alive && b.room === this.currentRoomId) b.fightHits = (b.fightHits || 0) + 1;
    }
  }

  // PORTRAIT GALLERY — grade the catch and hang it in a gold/silver/bronze frame
  framePortrait(boss) {
    const id = boss.bossId || 'grumbleclaw';
    const info = GALLERY.find((p) => p.id === id);
    if (!info) return;
    const pulls = boss.tugCount || 1;
    const hits = boss.fightHits || 0;
    const tier = gradeCapture(pulls, hits);
    const T = TIERS[tier];
    const prev = this.bridge.getFrame(id);
    const newBest = this.bridge.recordFrame(id, { tier, hero: this.char.id, pulls, hits }, info.name);
    if (T.bonus) this.addCash(T.bonus);
    this.hud.showFrame(id, info, tier, { pulls, hits, newBest, prevTier: prev ? prev.tier : null, bonus: T.bonus });
    this.unlock('frame_first');
    if (tier === 'gold') this.unlock('frame_gold');
    if (GALLERY.every((p) => { const f = this.bridge.getFrame(p.id); return f && f.tier === 'gold'; })) this.unlock('gallery_gold');
  }

  onTeammateFreed() {
    const pp = this.mansion.trapped.worldCenter();
    this.fx.sparkle(pp, 0xb07dff, 30);
    this.fx.puff(pp, 0xffffff, 20);
    this.sound.victory();
    this.rig.shake(0.3);
    this.hud.toast(`🖼️ ${this.trappedChar.name} is FREE!`, 'info');
    this.loot.spawn(pp.clone().add(new THREE.Vector3(0, -1, 1)), { gem: 1, pearl: 2, bill: 4 }, this.player.stats.luck, 0.8);
    this.unlock('rescue');
    this.success = true;
    // the rescue cutscene leads straight into the save screen
    this.freedTimer = Infinity;
    this.cutscene.enqueue(endingScene(this), {
      delay: 1.1,
      restore: false,
      onEnd: () => {
        this.goSave();
        this.cutscene.setFade(0);
      },
    });
  }

  onPlayerDown() {
    if (this.state !== State.PLAYING) return;
    this.setState(State.FAINTING);
    this.downTimer = 1.8;
    this.sound.setVacuum(false);
    this.sound.setTug(false);
    this.hud.toast(`${this.char.name} fainted!`, 'danger');
  }

  // ===================================================================
  // CHECKPOINTS — after each area boss, offer to save to the data file
  // ===================================================================
  goCheckpointSave() {
    if (this.state !== State.PLAYING || this.player.latched) {
      this.pendingCheckpoint = 1;
      return;
    }
    this.saveMode = 'checkpoint';
    this.setState(State.SAVE);
    this.sound.setVacuum(false);
    this.sound.setTug(false);
    this.hud.show(false);
    this.showScreen('save');
    this.menus.openSave(this.char, this.fileIndex, { area: this.area });
  }

  checkpointData() {
    return {
      hero: this.char.id,
      area: this.area,
      cash: this.cash,
      hp: Math.round(this.player.hp),
      ghostsCaught: this.ghostsCaught,
      runTime: Math.round(this.runTime),
      cleared: [...this.clearedRooms],
      trapped: this.trappedChar.id,
      secrets: { lawrence: !!this.mansion.lawrence.found, cats: !!this.catsFound },
      boos: [...this.boosCaught],
      keys: [...this.keys],
      usedKeys: [...this.usedKeys],
      speedies: [...this.speediesCaught],
      candleSets: [...this.elements.solved],
      quests: this.quests ? this.quests.serialize() : {},
      saved: Date.now(),
    };
  }

  saveFromMenu() {
    if (this.saveMode === 'checkpoint') {
      this.bridge.saveCheckpoint(this.fileIndex, this.checkpointData());
      // saving at a checkpoint also banks everything earned so far, in full
      const r = this.bankProgress(false, 1);
      if (r) {
        if (r.bank > 0) this.hud.toast(`🏦 +$${r.bank.toLocaleString('en-US')} banked for the Workshop`, 'info');
        for (const u of r.heroUps) this.hud.toast(`⭐ ${this.char.name} LV ${u.level}: ${u.text}`, 'info');
        for (const t of r.rewards) this.hud.toast(`🎁 ${t}`, 'info');
      }
    } else this.saveRunToFile();
  }

  afterSave() {
    if (this.state !== State.SAVE) return;
    if (this.saveMode === 'checkpoint') {
      this.saveMode = 'final';
      this.setState(State.PLAYING);
      this.showScreen(null);
      this.hud.show(true);
      this.clock.getDelta();
      this.renderer.domElement.focus();
      this.showTip(this.nextGoalHint(), 7);
    } else {
      this.showRankScreen();
    }
  }

  // ===================================================================
  // RESULTS
  // ===================================================================
  finishRun(success) {
    this.setState(success ? State.VICTORY : State.GAME_OVER);
    this.sound.setVacuum(false);
    this.sound.setTug(false);
    const rank = rankFor(this.cash);
    if (success) setTimeout(() => this.sound.rankFanfare(rank), 300);
    if (success) {
      this.unlock(this.bridge.heroClearSticker(this.char.id));
      if (rank === 'S') this.unlock('rich');
      if (this.player.damageTaken === 0) this.unlock('untouchable');
    }
    let newBest = false;
    if (success) {
      newBest = this.bridge.submitResult({
        heroId: this.char.id, cash: this.cash, rank, time: this.runTime, ghosts: this.ghostsCaught, rescuedId: this.trappedChar.id,
      });
    } else {
      this.bridge.scoreUpdate(this.cash, rank, this.ghostsCaught, true);
    }
    // progression: bank the treasure, award XP, level-ups and unlocks
    const progress = this.bankProgress(success);
    this.runXP = null; // banked once per run
    this.hud.showResults({
      success,
      newBest,
      progress,
      hero: this.char,
      teammate: this.trappedChar,
      cash: this.cash,
      ghosts: this.ghostsCaught,
      totalGhosts: Math.max(this.ghostsCaught, this.ghosts.length),
      time: this.runTime,
      rank,
      bridge: this.bridge,
      stickerIds: [...Object.keys(STICKERS), this.bridge.heroClearSticker(this.char.id)],
      newStickers: this.newStickers,
    });
  }

  togglePause() {
    if (this.state === State.PLAYING) {
      this.setState(State.PAUSED);
      this.sound.setVacuum(false);
      this.sound.setTug(false);
      this.sound.pauseSound();
      this.hud.showPause(this.bridge, [...Object.keys(STICKERS)], this.newStickers);
      this.menus.openPause();
    } else if (this.state === State.PAUSED) {
      this.setState(State.PLAYING);
      this.sound.pauseSound();
      this.showScreen(null);
      this.clock.getDelta();
    }
  }

  // ===================================================================
  // GAMEPLAY UPDATE
  // ===================================================================
  readGameInput() {
    const I = this.input;
    const P = I.pad;
    const clamp1 = (v) => Math.max(-1, Math.min(1, v));
    const input = {
      moveX: clamp1((I.down('KeyD') ? 1 : 0) - (I.down('KeyA') ? 1 : 0) + P.moveX),
      moveZ: clamp1((I.down('KeyS') ? 1 : 0) - (I.down('KeyW') ? 1 : 0) + P.moveZ),
      tankForward: (I.down('ArrowUp') ? 1 : 0) - (I.down('ArrowDown') ? 1 : 0),
      tankTurn: (I.down('ArrowRight') ? 1 : 0) - (I.down('ArrowLeft') ? 1 : 0),
      flashHeld: I.down('Space', 'KeyZ') || I.lmb,
      flashPressed: I.hit('Space', 'KeyZ') || I.lmbPressed || P.lightPressed,
      vacuumHeld: I.down('ShiftLeft', 'ShiftRight', 'KeyX') || I.rmb || P.vacuum > 0.3,
      // trigger depth caps suction: a light squeeze pulls gently, a full squeeze at full power
      vacuumDepth: I.down('ShiftLeft', 'ShiftRight', 'KeyX') || I.rmb ? 1 : 0.55 + Math.max(0, P.vacuum - 0.3) / 0.7 * 0.45,
      interact: I.hit('KeyE', 'Enter', 'NumpadEnter') || P.interactPressed,
      // Elemental Medal: spray whatever element is in the tank
      sprayHeld: I.down('KeyQ', 'KeyC') || P.spray,
      sprayPressed: I.hit('KeyQ', 'KeyC') || P.sprayPressed,
      // switch to the next hero who has joined the team
      swap: I.hit('KeyT') || P.swapPressed,
      mouseAim: I.mouseAim && I.mouseInside,
      mouseMoved: I.mouseMovedFrame,
      aimPoint: null,
      // right stick aims the flashlight / nozzle independently of movement
      stickAim: P.aimLen > 0.35 ? { x: P.aimX, z: P.aimZ } : null,
    };
    if (input.mouseAim) {
      this.raycaster.setFromCamera(I.mouse, this.camera);
      if (this.raycaster.ray.intersectPlane(this.aimPlane, this.aimPoint)) input.aimPoint = this.aimPoint;
    }
    return input;
  }

  // cutscenes: the script drives the camera and hero; the house keeps living
  // (doors swing, fires crackle, loot settles) but ghosts hold still
  // the outside of the mansion is built once, the first time the story needs it
  getExterior() {
    if (!this.exterior) this.exterior = new Exterior();
    return this.exterior;
  }

  updateCutscene(dt) {
    const cs = this.cutscene;
    cs.update(dt, this.input);
    if (this.viewScene && this.exterior) this.exterior.update(dt, this.sound);
    if (!this.scene) return;
    const level = this.mansion.rooms[this.currentRoomId].level;
    for (const d of this.mansion.doorList) {
      if (d === cs.holdDoor || d.locked) continue;
      const dr = this.mansion.rooms[d.rooms[0]];
      if (!dr || dr.level === level) d.update(dt, this);
    }
    this.loot.update(dt, this);
    this.fx.update(dt);
    // lights and wall cutaways follow the camera's subject, not the hero
    const f = cs.playing ? cs.focus : this.player.pos;
    const fr = this.mansion.roomAt(f.x, f.z);
    this.mansion.update(dt, this.time, f, this.camera, fr ? fr.id : this.currentRoomId);
    if (cs.playing) cs.applyCamera(dt);
    else this.rig.update(dt, this.player.pos, this.player.facingDir, this.mansion.rooms[this.currentRoomId]);
  }

  updatePlay(dt) {
    if (this.transition) {
      this.updateTransition(dt);
      this.updateHud(dt);
      return;
    }
    if (this.cutscene.tryStart(dt)) return;
    const t = this.time;
    this.runTime += dt;
    const input = this.readGameInput();
    this.swapCooldown = Math.max(0, (this.swapCooldown || 0) - dt);
    if (input.swap) this.swapHero();
    const player = this.player;
    const before = player.pos.clone();
    player.update(dt, input, this, t);
    this.movedDist += before.distanceTo(player.pos);

    // room tracking
    const room = this.mansion.roomAt(player.pos.x, player.pos.z);
    if (room && room.id !== this.currentRoomId) this.onEnterRoom(room);

    const level = this.mansion.rooms[this.currentRoomId].level;
    for (const d of this.mansion.doorList) {
      const dr = this.mansion.rooms[d.rooms[0]];
      if (!dr || dr.level === level) d.update(dt, this);
    }
    for (const g of this.ghosts) {
      const gr = this.mansion.rooms[g.room];
      if (gr && gr.level !== level && g.state === 'hidden') continue;
      g.update(dt, this, t);
      if (g.state === 'tug') g.model.heart.visible = false;
    }

    // Poltergust suction on furniture, curtains, paintings (they lean toward the nozzle)
    if (player.vacuumActive && !player.latched) {
      const nozzle = player.nozzleWorld(new THREE.Vector3());
      for (const it of this.mansion.interactables) {
        if (it.room !== this.currentRoomId) continue;
        if (it.kind === 'chest') continue;
        const inf = player.vacuumInfluence(it.worldCenter());
        if (inf > 0.05) it.poke(dt * (0.6 + inf * 1.8), this, nozzle);
      }
    }

    // chests pop open when the hero walks up to them
    for (const it of this.mansion.interactables) {
      if (it.kind !== 'chest' || it.room !== this.currentRoomId) continue;
      const c = it.worldCenter();
      it.approach(Math.hypot(c.x - player.pos.x, c.z - player.pos.z), this);
    }

    // scattered teammates: talking to one comes before anything else nearby
    this.quests.update(dt, t);
    const npc = player.latched ? null : this.quests.nearest(player.pos, this.currentRoomId);
    if (npc) {
      this.hud.prompt(`${this.btn('<kbd>E</kbd> / <kbd>ENTER</kbd>', '<kbd class="pad-a">A</kbd>')} ${this.quests.promptFor(npc)}`);
      if (input.interact) this.quests.talk(npc);
    }

    // stairs & trapdoors take priority over searching
    const portal = player.latched || npc ? null : this.mansion.portalNear(player.pos, this.currentRoomId);
    if (portal) {
      const keyE = this.btn('<kbd>E</kbd> / <kbd>ENTER</kbd>', '<kbd class="pad-a">A</kbd>');
      this.hud.prompt(portal.locked ? `🔒 ${this.btn('<kbd>E</kbd>', '<kbd class="pad-a">A</kbd>')} locked` : `${keyE} ${portal.label}`);
      if (input.interact) {
        if (portal.locked) {
          this.sound.locked();
          this.hud.toast(portal.lockHint || 'It won\'t budge...', 'danger');
        } else {
          this.usePortal(portal);
        }
      }
    } else if (!npc) {
      // interact prompt (E / Enter)
      const near = this.mansion.nearestInteractable(player.pos, CONFIG.player.interactRange + 0.6, (it) =>
        it.room === this.currentRoomId && (!it.searched || it.booHide) && !it.freed && it.kind !== 'curtain' && (it.kind !== 'painting' || it.active) && !(it.kind === 'chest' && it.hidden));
      if (near && !player.latched) {
        const label = near.kind === 'chest' ? 'open chest' : near.kind === 'painting' ? 'vacuum the painting!' : 'search';
        this.hud.prompt(`${this.btn('<kbd>E</kbd> / <kbd>ENTER</kbd>', '<kbd class="pad-a">A</kbd>')} ${label}`);
        if (input.interact) {
          if (near.kind === 'painting') near.poke(0.5, this);
          else near.poke(near.searchTime + 1, this);
        }
      } else {
        this.hud.prompt(null);
      }
    }

    this.updateBooRadar(dt);
    this.updateKeys(dt);
    this.elements.update(dt, input);
    this.loot.update(dt, this);
    this.fx.update(dt);
    this.mansion.update(dt, t, player.pos, this.camera, this.currentRoomId);
    this.rig.update(dt, player.pos, player.facingDir, room || this.mansion.rooms[this.currentRoomId]);

    this.sound.setTug(!!player.latched, player.latched ? player.latched.hp / player.latched.maxHp : 1, player.latched ? player.latched.lastOpposition || 0 : 0);
    this.updateTugRumble(dt);
    this.updateTutorial(dt);
    this.updateAudioMood();

    if (this.pendingCheckpoint > 0) {
      this.pendingCheckpoint -= dt;
      if (this.pendingCheckpoint <= 0) this.goCheckpointSave();
    }
    if (this.success) {
      this.freedTimer -= dt;
      if (this.freedTimer <= 0) this.goSave();
    }
    this.updateHud(dt);
  }

  // Tug-of-war through the hands: a steady buzz that grows as the ghost
  // weakens, a stronger kick while you pull the right way, and a jolt
  // whenever the ghost thrashes off in a new direction.
  updateTugRumble(dt) {
    const g = this.player.latched;
    if (!g || !this.options.shake || !this.input.pad.connected) {
      this.tugRumbleTimer = 0;
      this.lastFleeX = undefined;
      return;
    }
    this.tugRumbleTimer -= dt;
    const turned = this.lastFleeX !== undefined && Math.abs(g.fleeDir.x - this.lastFleeX) > 0.5;
    this.lastFleeX = g.fleeDir.x;
    if (this.tugRumbleTimer > 0 && !turned) return;
    this.tugRumbleTimer = 0.1;
    const weak01 = 1 - Math.max(0, g.hp) / g.maxHp;
    const opp = g.lastOpposition || 0;
    const extra = this.player.extraLatched.length * 0.18; // a group pull shakes harder
    if (turned) this.input.rumble(0.9, 1, 160);
    else this.input.rumble(0.25 + opp * 0.55 + extra, 0.12 + weak01 * 0.5 + (g.isBoss ? 0.15 : 0) + extra, 130);
  }

  // button names for prompts: controller labels while the pad is in use
  btn(kb, pad) {
    return this.input.pad.active ? pad : kb;
  }

  onEnterRoom(room) {
    const prevLevel = this.currentLevel;
    this.currentRoomId = room.id;
    this.currentLevel = room.level;
    if (prevLevel && prevLevel !== room.level) this.hud.toast(`${room.level} — ${LEVEL_NAMES[room.level]}`, 'info');
    const first = !this.visited.has(room.id);
    this.visited.add(room.id);
    if (this.elements) this.elements.onEnterRoom(room.id);
    if (!first) return;
    if (room.id === ROOM_IDS.HALLWAY) {
      this.showTip(`Aim your <b>vacuum</b> at furniture or press ${this.btn('<b>E</b>', '<b>A</b>')} to shake out coins, bills and gems!`, 6);
    } else if (room.id === ROOM_IDS.PARLOR) {
      this.hud.toast('The Parlor... the fire is crackling.', 'info');
      this.showTip('Two ghosts! Stun them <b>together</b> in your light, then vacuum one — the other gets dragged into the same pull for a <b>DOUBLE CATCH</b> bonus.', 7);
    } else if (room.id !== ROOM_IDS.FOYER) {
      this.hud.toast(`📍 ${room.name}`, 'info');
    }
    if (this.visited.size >= Object.keys(ROOM_DEFS).length) this.unlock('explorer');
  }

  updateTutorial(dt) {
    const g = this.tutorialGhost;
    if (this.tipTimer > 0) {
      this.tipTimer -= dt;
      if (this.tipTimer <= 0) this.hud.tutorial(null);
      return;
    }
    if (!g || !g.alive) return;
    if (this.tutorialStep === 0 && this.movedDist > 3) {
      this.tutorialStep = 1;
      g.appear(this);
    } else if (this.tutorialStep >= 2) {
      if (g.state === 'stunned' && this.tutorialStep !== 3) {
        this.tutorialStep = 3;
        this.hud.tutorial(`Stunned — its <b>heart</b> is showing! HOLD ${this.btn('<b>RIGHT-CLICK</b> / <b>SHIFT</b> / <b>X</b>', '<b>RT</b>')} to vacuum it up!`);
      } else if (g.state === 'tug' && this.tutorialStep !== 4) {
        this.tutorialStep = 4;
        this.hud.tutorial(this.btn('Tug-of-war! Keep the vacuum on and <b>run the opposite way</b> from where the ghost pulls.',
          'Tug-of-war! Keep <b>RT</b> squeezed and push the <b>LEFT STICK</b> away from the ghost — feel it fight back!'));
      } else if ((g.state === 'roam' || g.state === 'escape') && this.tutorialStep > 2) {
        this.tutorialStep = 2;
        this.hud.tutorial('It got away! Wait for its heart to show, then catch it in your <b>light</b> again.');
      }
    }
  }

  updateAudioMood() {
    let fire = 0;
    for (const f of this.mansion.fires || []) {
      const fr = this.mansion.roomAt(f.origin.x, f.origin.z);
      if (!fr || fr.id !== this.currentRoomId) continue;
      const d = Math.hypot(this.player.pos.x - f.origin.x, this.player.pos.z - f.origin.z);
      fire = Math.max(fire, THREE.MathUtils.clamp(1 - d / 13, 0, 1));
    }
    if (this.currentRoomId === ROOM_IDS.BOILER_ROOM) fire = Math.max(fire, 0.6);
    this.sound.setFire(fire);
    const danger = this.ghosts.some((g) => g.alive && g.room === this.currentRoomId && g.visible && g.state !== 'eating' && g.state !== 'perform');
    this.sound.setTension(danger || this.player.latched ? 1 : 0);
    // the waltz arrangement: shaky in the dark, nervous near ghosts, bright once lit
    const lit = !!(this.mansion.rooms[this.currentRoomId] || {}).lit;
    this.musicMood = this.player.latched ? 'tug' : danger ? 'tense' : lit ? 'lit' : 'dark';
  }

  updateHud(dt) {
    const p = this.player;
    const M = this.mansion;
    const level = M.rooms[this.currentRoomId].level;
    // the Game Boy Horror map only needs ~20 refreshes a second; rebuilding
    // and redrawing it every frame was pure overhead
    this.radarTimer = (this.radarTimer || 0) - dt;
    let radar = null;
    if (this.radarTimer <= 0) {
      this.radarTimer = 0.05;
      const rooms = M.roomList.filter((r) => r.level === level).map((r) => ({
        minX: r.minX, maxX: r.maxX, minZ: r.minZ, maxZ: r.maxZ, current: r.id === this.currentRoomId, lit: r.lit, visited: this.visited.has(r.id),
      }));
      const doors = M.doorList.filter((d) => M.rooms[d.rooms[0]] && M.rooms[d.rooms[0]].level === level)
        .map((d) => ({ x: d.center.x, z: d.center.z, locked: d.locked, open: d.isOpen, axis: d.axis, keyed: d.locked && this.keys.has(d.name) }));
      const portals = M.portals.filter((q) => M.rooms[q.room].level === level).map((q) => ({ x: q.x, z: q.z, locked: q.locked }));
      const josh = p.char.id === 'josh';
      const ghosts = this.ghosts.filter((g) => g.alive && M.rooms[g.room] && M.rooms[g.room].level === level).map((g) => ({
        x: g.pos.x, z: g.pos.z, visible: g.visible, boss: g.isBoss, boo: !!g.isBoo, stunned: g.state === 'stunned', sensed: josh && !g.bonus,
      }));
      radar = { rooms, doors, portals, ghosts, level, booCloseness: this.booCloseness || 0, player: { x: p.pos.x, z: p.pos.z, facing: p.facing } };
    }
    let ghostNear = false;
    for (const g of this.ghosts) {
      if (g.alive && g.visible && Math.hypot(g.pos.x - p.pos.x, g.pos.z - p.pos.z) < 6) ghostNear = true;
    }

    let tug = null;
    if (p.latched) {
      const g = p.latched;
      const v = g.pos.clone().add(new THREE.Vector3(0, g.isBoss ? 2.6 : 1.7, 0)).project(this.camera);
      tug = {
        x: (v.x * 0.5 + 0.5) * window.innerWidth,
        y: (-v.y * 0.5 + 0.5) * window.innerHeight,
        hp: Math.max(0, g.hp),
        opposition: g.lastOpposition || 0,
        group: 1 + p.extraLatched.length,
      };
    }

    const boss = (this.bosses || []).find((b) => b.alive && b.room === this.currentRoomId);
    if (boss) {
      this.hud.setBoss({
        hp: boss.hp, max: boss.maxHp, state: boss.hudState,
        name: boss.profile ? boss.profile.name : 'GRUMBLECLAW', title: boss.profile ? boss.profile.title : 'the Goon of the Banquet',
        labels: boss.profile ? boss.profile.labels : null,
      });
    } else {
      this.hud.setBoss(null);
    }

    this.hud.update(dt, {
      hp: p.hp,
      maxHp: p.maxHp,
      cash: this.cash,
      flashCharge: p.flashCharge,
      lightOn: p.lightOn,
      vacuumPower: p.vacuumPower,
      latched: !!p.latched,
      tugOpposition: p.latched ? p.latched.lastOpposition : 0,
      roomName: M.rooms[this.currentRoomId].name,
      ghostsLeft: this.ghosts.filter((g) => g.alive && !g.bonus && g.room === this.currentRoomId).length,
      keys: [...this.keys.values()],
      element: this.elements ? this.elements.hudState() : null,
      boos: { caught: this.boosCaught.size, total: this.booTotal, closeness: this.booCloseness || 0, led: this.booLed > 0 },
      ghostNear,
      tug,
      radar,
    });
  }

  // ===================================================================
  // MAIN LOOP
  // ===================================================================
  // keeps the game near 60fps in any iframe: drops render resolution when
  // frames run long, and creeps back up when there is headroom
  governPerformance(rawDt) {
    if (!this.perf) {
      const base = Math.min(window.devicePixelRatio || 1, CONFIG.render.pixelRatioCap) * CONFIG.render.retroScale;
      this.perf = { base, ratio: base, accum: 0, frames: 0 };
    }
    const p = this.perf;
    const S = this.state;
    const busy = S === State.PLAYING || S === State.CUTSCENE || S === State.BOOT || S === State.CHAR_SELECT;
    if (!busy || rawDt > 0.25) return; // ignore tab switches & static menus
    p.accum += rawDt;
    p.frames++;
    if (p.accum < 2) return;
    const avg = p.accum / p.frames;
    p.accum = 0;
    p.frames = 0;
    let next = p.ratio;
    if (avg > 1 / 48) next = Math.max(p.base * 0.55, p.ratio - 0.15);
    else if (avg < 1 / 58) next = Math.min(p.base, p.ratio + 0.1);
    // already at the lowest resolution and still struggling: drop the post effects
    if (avg > 1 / 40 && p.ratio <= p.base * 0.56 && this.postfx.enabled) {
      this.postfx.enabled = false;
      this.hud.toast('Graphics lowered to keep the game smooth (Options → Graphics)', 'info');
    }
    if (Math.abs(next - p.ratio) > 0.01) {
      p.ratio = next;
      this.renderer.setPixelRatio(next);
      this.onResize();
    }
  }

  frame() {
    const rawDt = this.clock.getDelta();
    const dt = Math.min(0.05, rawDt);
    this.governPerformance(rawDt);
    this.time += dt;
    const I = this.input;
    FX_UNIFORMS.uTime.value = this.time;
    this.postfx.update(dt);
    if (this.scene && this.player && this.dust) this.dust.update(this.player, this.renderer.getPixelRatio(), window.innerHeight);
    const padMode = this.state === State.PLAYING ? 'play' : this.state === State.PAUSED ? 'pause' : 'menu';
    I.pollPad(dt, padMode);
    // some browsers accept a pad press as the gesture that starts audio
    if ((!this.sound.ctx || this.sound.ctx.state !== 'running') && I.pad.buttons.some((b, i) => b && !I.pad.prev[i])) {
      this.sound.init();
      this.sound.resume();
    }
    if (I.pad.active !== this.padLabels) {
      this.padLabels = I.pad.active;
      document.body.classList.toggle('pad-active', this.padLabels);
    }
    if (padMode !== 'play' && this.state !== State.FAINTING && I.rumbleUntil > 0) I.stopRumble();

    if (this.state !== State.BOOT) {
      if (I.hit('KeyM')) this.setMuted(!this.sound.muted);
      if (I.hit('KeyV')) this.toggleCRT();
    }

    switch (this.state) {
      case State.BOOT:
        if (I.hit('Enter', 'NumpadEnter', 'Space')) this.leaveBoot();
        this.renderTitle(dt);
        break;
      case State.DATA_SELECT:
        this.menus.handleDataSelect(I);
        this.renderTitle(dt);
        break;
      case State.OPTIONS:
        this.menus.handleOptions(I);
        this.renderTitle(dt);
        break;
      case State.GALLERY:
        this.menus.handleGallery(I);
        this.renderTitle(dt);
        break;
      case State.BRIGHTNESS:
        this.menus.handleBrightness(I);
        this.renderTitle(dt);
        break;
      case State.CHAR_SELECT: {
        if (I.hit('ArrowRight', 'KeyD')) this.highlight(this.selectedIndex + 1);
        if (I.hit('ArrowLeft', 'KeyA')) this.highlight(this.selectedIndex - 1);
        if (I.hit('ArrowDown', 'KeyS')) this.highlight(this.selectedIndex + 3);
        if (I.hit('ArrowUp', 'KeyW')) this.highlight(this.selectedIndex - 3);
        if (I.hit('Escape')) {
          this.sound.blip();
          this.goDataSelect(this.fileIndex);
        } else if (I.hit('KeyC', 'KeyU')) this.openWorkshop();
        else if (I.hit('Enter', 'NumpadEnter', 'Space')) this.confirmSelect();
        else {
          this.renderTitle(dt);
          this.renderPreview(dt);
        }
        break;
      }
      case State.WORKSHOP: {
        const n = UPGRADES.length;
        if (I.hit('ArrowDown', 'KeyS')) this.moveWorkshop(1);
        if (I.hit('ArrowUp', 'KeyW')) this.moveWorkshop(-1);
        if (I.hit('Escape', 'KeyC', 'KeyU')) this.closeWorkshop();
        else if (I.hit('Enter', 'NumpadEnter', 'Space')) this.buyUpgrade(this.wsIndex % n);
        break;
      }
      case State.PLAYING:
        if (I.hit('KeyP', 'Escape')) {
          this.togglePause();
          this.postfx.render(this.scene, this.camera);
          break;
        }
        this.updatePlay(dt);
        if (this.scene) this.postfx.render(this.scene, this.camera);
        break;
      case State.CUTSCENE:
        // story shots render the mansion from outside instead of the rooms
        this.updateCutscene(dt);
        if (this.scene) this.postfx.render(this.viewScene || this.scene, this.camera);
        break;
      case State.PAUSED:
        this.menus.handlePause(I);
        // the world is frozen behind the pause menu: redraw only after a resize
        if (this.scene && this.pauseDirty) {
          this.pauseDirty = false;
          this.postfx.render(this.scene, this.camera);
        }
        break;
      case State.SAVE:
        this.menus.handleSave(I);
        // the save screen is an opaque wall: nothing behind it needs drawing
        break;
      case State.FAINTING:
        this.downTimer -= dt;
        this.player.model.rotation.x = Math.min(Math.PI / 2, this.player.model.rotation.x + dt * 3);
        this.fx.update(dt);
        this.mansion.update(dt, this.time, this.player.pos, this.camera, this.currentRoomId);
        this.rig.update(dt, this.player.pos, null, this.mansion.rooms[this.currentRoomId]);
        this.hud.update(dt, {
          hp: 0, maxHp: this.player.maxHp, cash: this.cash, flashCharge: 0, vacuumPower: 0, latched: false,
          roomName: this.mansion.rooms[this.currentRoomId].name, ghostsLeft: this.ghosts.filter((g) => g.alive && !g.bonus).length, ghostNear: false, tug: null, radar: null,
        });
        if (this.downTimer <= 0) this.finishRun(false);
        this.postfx.render(this.scene, this.camera);
        break;
      case State.VICTORY:
      case State.GAME_OVER:
        if (I.hit('Enter', 'NumpadEnter')) this.afterResults();
        if (this.scene) {
          this.mansion.update(dt, this.time, this.player.pos, this.camera, this.currentRoomId);
          this.postfx.render(this.scene, this.camera);
        } else this.renderTitle(dt);
        break;
      default:
        break;
    }

    const S = this.state;
    this.sound.setMusic(
      S === State.PLAYING || S === State.CUTSCENE ? this.musicMood || 'dark'
        : S === State.CHAR_SELECT || S === State.WORKSHOP ? 'select'
          : S === State.DATA_SELECT || S === State.OPTIONS || S === State.BRIGHTNESS || S === State.GALLERY ? 'menu'
            : 'off',
    );
    if (S !== State.PLAYING || this.transition) this.sound.setSpray(null);
    this.sound.update(dt, this.state === State.PLAYING || this.state === State.CUTSCENE);
    I.endFrame();
  }
}

// ===================================================================
// BOOT
// ===================================================================
function boot() {
  try {
    window.__widr64 = new Game();
  } catch (err) {
    console.error(err);
    const b = document.getElementById('boot');
    if (b) {
      b.querySelector('.boot-sub').textContent = 'WebGL could not start on this device. Try another browser or enable hardware acceleration.';
    }
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
