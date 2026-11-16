// ==========================================================
// Elements.js — Elemental Medals. Vacuum up FIRE (fireplaces, braziers,
// lit candles), WATER (sinks, tubs) or ICE (ice buckets), then spray it
// out of the Poltergust: water douses Blazing Ghosts, ice freezes Drip
// Ghosts, fire thaws Frost Ghosts — and fire lights cold candles.
// ==========================================================
import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { makeGlowTexture } from '../graphics/textures.js';

export const ELEMENTS = {
  fire: { name: 'FIRE', icon: '🔥', a: new THREE.Color(0xfff0a0), b: new THREE.Color(0xff4a10), speed: 7.5, gravity: -1.5, life: 0.6, spread: 0.16 },
  water: { name: 'WATER', icon: '💧', a: new THREE.Color(0xbfe6ff), b: new THREE.Color(0x2a78ff), speed: 8.5, gravity: 9, life: 0.7, spread: 0.1 },
  ice: { name: 'ICE', icon: '❄️', a: new THREE.Color(0xffffff), b: new THREE.Color(0x8ad8ff), speed: 5.5, gravity: 0.6, life: 0.9, spread: 0.2 },
};

const ABSORB_TIME = 0.6; // seconds of suction to fill the tank
const SPRAY_TIME = 5; // seconds of spray in a full tank
const SPRAY_RANGE = 5.2;
const SPRAY_DOT = 0.88; // ~28° half-angle cone
const ABSORB_RANGE = 3.2;

// where water and ice come from (fire comes from every hearth in the house)
const WATER_SOURCES = [
  { x: 33.1, z: -8, y: 1.0 }, // kitchen sink
  { x: -22.8, z: -98.6, y: 0.6 }, // bathtub
  { x: -18.6, z: -99.2, y: 0.9 }, // bathroom basin
  { x: 29.2, z: 1.6, y: 0.6 }, // washtubs
  { x: 32.2, z: 1.6, y: 0.6 },
];
const ICE_BUCKETS = [
  { x: -15.3, z: -91.3 }, // bathroom
  { x: 27.0, z: 1.0 }, // washroom
  { x: -20, z: 99.8 }, // wine cellar (champagne on ice)
];
const BRAZIERS = [{ x: 16.5, z: -114 }]; // observatory
const CANDELABRA_FLAMES = [[-5, 84], [5, 84], [-5, 95], [5, 95.5]]; // the crypt's lit candelabras

// cold candles waiting for a flame. Light every candle in a room for its treasure.
export const CANDLE_SETS = [
  { id: 'parlor', name: 'Parlor', spots: [[-9.3, -14.7], [-16.2, -1.6], [-3.4, -1.4]], reward: { coin: 8, bill: 4, pearl: 1 } },
  { id: 'study', name: 'Study', spots: [[-38.9, 2.6], [-32.2, 5.3], [-25.0, -8.4]], reward: { coin: 8, bill: 5, gem: 0.6 } },
  { id: 'bedroom', name: 'Master Bedroom', spots: [[13.0, -101.0], [-7.1, -106], [13.0, -111.2], [-7.1, -120.5]], reward: { gem: 1, pearl: 2, bill: 5 } },
];

const std = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, flatShading: true, ...opts });
const BRASS = std(0xc9952e, { metalness: 0.6, roughness: 0.35 });
const IRON = std(0x2a2628, { metalness: 0.5 });

function glowSprite(tex, color, size, opacity = 0.8) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.set(size, size, size);
  return s;
}

function buildIceBucket() {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.8, 5), BRASS);
    leg.position.set(Math.cos(a) * 0.2, 0.4, Math.sin(a) * 0.2);
    g.add(leg);
  }
  const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.4, 12, 1, true), BRASS);
  bucket.position.y = 0.95;
  g.add(bucket);
  const base = new THREE.Mesh(new THREE.CircleGeometry(0.22, 12), BRASS);
  base.rotation.x = -Math.PI / 2;
  base.position.y = 0.76;
  g.add(base);
  const iceMat = std(0xd8f6ff, { emissive: 0x6ac8ff, emissiveIntensity: 0.5, transparent: true, opacity: 0.85, roughness: 0.1 });
  for (let i = 0; i < 9; i++) {
    const cube = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), iceMat);
    cube.position.set((Math.random() - 0.5) * 0.36, 1.08 + Math.random() * 0.1, (Math.random() - 0.5) * 0.36);
    cube.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    g.add(cube);
  }
  const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.5, 8), std(0x1f4a2a, { roughness: 0.2 }));
  bottle.position.set(0.08, 1.15, 0.04);
  bottle.rotation.z = 0.25;
  g.add(bottle);
  return g;
}

function buildBrazier() {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 0.06), IRON);
    leg.position.set(Math.cos(a) * 0.32, 0.45, Math.sin(a) * 0.32);
    leg.rotation.z = Math.cos(a) * 0.2;
    leg.rotation.x = -Math.sin(a) * 0.2;
    g.add(leg);
  }
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), IRON);
  bowl.position.y = 1.15;
  g.add(bowl);
  const coals = new THREE.Mesh(new THREE.CircleGeometry(0.4, 12), std(0xff5a1a, { emissive: 0xff3a00, emissiveIntensity: 1.4 }));
  coals.rotation.x = -Math.PI / 2;
  coals.position.y = 1.05;
  g.add(coals);
  return g;
}

function buildCandleStand() {
  const g = new THREE.Group();
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.06, 10), BRASS);
  foot.position.y = 0.03;
  g.add(foot);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.2, 6), BRASS);
  stem.position.y = 0.63;
  g.add(stem);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.06, 0.06, 10), BRASS);
  cup.position.y = 1.25;
  g.add(cup);
  const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.32, 8), std(0xf4ecd8, { roughness: 0.8 }));
  wax.position.y = 1.44;
  g.add(wax);
  const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.05, 4), std(0x1a1410));
  wick.position.y = 1.62;
  g.add(wick);
  return g;
}

export class ElementSystem {
  constructor(game, solved = []) {
    this.game = game;
    const mansion = game.mansion;
    this.mansion = mansion;
    this.root = mansion.root;
    this.tex = makeGlowTexture('#ffffff');
    this.type = null;
    this.amount = 0;
    this.absorbing = null; // the source currently being sucked
    this.absorbT = 0;
    this.spraying = false;
    this.emitAcc = 0;
    this.tips = {};
    this.toastCool = 0;
    this.solved = new Set(solved.filter((id) => CANDLE_SETS.some((s) => s.id === id)));
    this.caughtKinds = new Set();
    this.tmp = new THREE.Vector3();
    this.nozzle = new THREE.Vector3();

    // --- sources
    this.sources = [];
    const roomOf = (x, z) => {
      const r = mansion.roomAt(x, z);
      return r ? r.id : null;
    };
    for (const f of mansion.fires || []) {
      this.sources.push({ type: 'fire', pos: new THREE.Vector3(f.origin.x, f.origin.y + 0.5, f.origin.z), room: roomOf(f.origin.x, f.origin.z) });
    }
    for (const w of WATER_SOURCES) this.sources.push({ type: 'water', pos: new THREE.Vector3(w.x, w.y, w.z), room: roomOf(w.x, w.z) });
    for (const b of ICE_BUCKETS) {
      const room = roomOf(b.x, b.z);
      mansion.place(buildIceBucket(), b.x, b.z, { room });
      this.sources.push({ type: 'ice', pos: new THREE.Vector3(b.x, 1.1, b.z), room });
    }
    for (const b of BRAZIERS) {
      const room = roomOf(b.x, b.z);
      mansion.place(buildBrazier(), b.x, b.z, { room });
      mansion.addLight(b.x, 1.8, b.z, 0xff7a2a, 9, 9, 1.6, room, { flickerAmt: 0.45, fire: true });
      const glow = glowSprite(this.tex, 0xff8a30, 2.2, 0.7);
      glow.position.set(b.x, 1.45, b.z);
      this.root.add(glow);
      const fire = mansion.makeFireParticles(new THREE.Vector3(b.x, 1.1, b.z), glow, 0.32, 36);
      this.sources.push({ type: 'fire', pos: fire.origin.clone().setY(1.5), room });
    }
    for (const [x, z] of CANDELABRA_FLAMES) this.sources.push({ type: 'fire', pos: new THREE.Vector3(x, 1.9, z), room: roomOf(x, z) });

    // --- cold candles
    this.candles = [];
    this.sets = CANDLE_SETS.map((def) => {
      const room = roomOf(def.spots[0][0], def.spots[0][1]);
      const set = { def, room, candles: [] };
      for (const [x, z] of def.spots) {
        const group = mansion.place(buildCandleStand(), x, z, { room, pad: 0.02 });
        const flame = glowSprite(this.tex, 0xffb050, 0.5, 0.95);
        flame.position.set(x, 1.72, z);
        flame.visible = false;
        this.root.add(flame);
        const c = { group, flame, set, room, wick: new THREE.Vector3(x, 1.65, z), lit: false, heat: 0, light: null };
        set.candles.push(c);
        this.candles.push(c);
      }
      if (this.solved.has(def.id)) set.candles.forEach((c) => this.lightCandle(c, true));
      return set;
    });

    // --- particle pool shared by the spray and the suction stream
    const N = 180;
    this.N = N;
    const geo = new THREE.BufferGeometry();
    this.posArr = new Float32Array(N * 3).fill(-100);
    this.colArr = new Float32Array(N * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(this.posArr, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colArr, 3));
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.36, map: this.tex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.points.frustumCulled = false;
    this.root.add(this.points);
    this.parts = Array.from({ length: N }, () => ({ alive: false, p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0, max: 1, col: new THREE.Color(), suck: false, g: 0 }));
    this.cursor = 0;
  }

  // ---------------------------------------------------------------
  update(dt, input) {
    const game = this.game;
    const player = game.player;
    this.toastCool -= dt;
    const nozzle = player.nozzleWorld(this.nozzle);
    const roomId = game.currentRoomId;
    // the candle hint also appears a few seconds after you clear the room you're in
    if (roomId !== this.lastRoom) {
      this.lastRoom = roomId;
      this.roomT = 0;
    }
    if (game.clearedRooms.has(roomId)) this.roomT += dt;
    if (this.roomT > 6 && this.roomT - dt <= 6) this.onEnterRoom(roomId);

    // --- absorb: suction pointed at a source fills the tank
    let src = null;
    if (player.vacuumActive && !player.latched) {
      let best = 0;
      const consider = (type, pos, room) => {
        if (room !== roomId) return;
        if (Math.hypot(pos.x - player.pos.x, pos.z - player.pos.z) > ABSORB_RANGE) return;
        const inf = player.vacuumInfluence(pos);
        if (inf > 0.08 && inf > best) {
          best = inf;
          src = { type, pos };
        }
      };
      for (const s of this.sources) consider(s.type, s.pos, s.room);
      for (const c of this.candles) if (c.lit) consider('fire', c.wick, c.room);
    }
    if (src) {
      const full = this.type === src.type && this.amount >= 1;
      this.absorbT = this.absorbing && this.absorbing.type === src.type ? this.absorbT + dt : dt;
      this.absorbing = src;
      if (!full) {
        // a stream of the element flows into the nozzle
        this.emitAcc += dt * 40;
        while (this.emitAcc > 1) {
          this.emitAcc -= 1;
          this.spawnSuck(src.type, src.pos);
        }
        if (this.absorbT >= ABSORB_TIME) this.fill(src.type);
      }
    } else {
      this.absorbing = null;
      this.absorbT = 0;
    }

    // --- spray
    const wantSpray = input.sprayHeld && !player.latched && !player.vacuumActive;
    this.spraying = wantSpray && this.amount > 0 && !!this.type;
    if (wantSpray && !this.spraying && input.sprayPressed) {
      game.sound.sizzle();
      if (this.toastCool <= 0) {
        this.toastCool = 3;
        game.hud.toast('The tank is empty! Vacuum up fire, water or ice first.', 'info');
      }
    }
    if (this.spraying) {
      this.amount = Math.max(0, this.amount - dt / SPRAY_TIME);
      this.emitAcc += dt * 75;
      while (this.emitAcc > 1) {
        this.emitAcc -= 1;
        this.spawnSpray(this.type, nozzle, player.facingDir);
      }
      this.sprayHits(dt, nozzle, player);
      if (game.input && game.input.rumble && Math.random() < dt * 8) game.input.rumble(0.12, 0, 60);
    }
    game.sound.setSpray(this.spraying ? this.type : null);
    if (this.amount <= 0 && this.type && !this.spraying) this.type = null;

    this.updateParticles(dt, nozzle);
    for (const c of this.candles) {
      if (!c.lit) c.heat = Math.max(0, c.heat - dt * 0.5);
      else c.flame.scale.setScalar(0.45 + Math.sin(game.time * 12 + c.wick.x) * 0.04 + Math.random() * 0.03);
    }
  }

  fill(type) {
    const game = this.game;
    const changed = this.type !== type || this.amount < 0.5;
    this.type = type;
    this.amount = 1;
    if (!changed) return;
    game.sound.elementAbsorb(type);
    game.fx.sparkle(game.player.nozzleWorld(new THREE.Vector3()), ELEMENTS[type].b.getHex(), 10);
    if (!this.tips['got_' + type]) {
      this.tips['got_' + type] = true;
      const use = { fire: 'It thaws <b>Frost Ghosts</b> and lights cold candles.', water: 'It douses <b>Blazing Ghosts</b>.', ice: 'It freezes <b>Drip Ghosts</b> solid.' }[type];
      game.showTip(`${ELEMENTS[type].icon} You vacuumed up <b>${ELEMENTS[type].name}</b>! ${game.btn('Hold <kbd>Q</kbd> to spray it.', 'Hold <kbd>Y</kbd> to spray it.')} ${use}`, 7);
    } else {
      game.hud.toast(`${ELEMENTS[type].icon} ${ELEMENTS[type].name} loaded`, 'info');
    }
  }

  sprayHits(dt, nozzle, player) {
    const game = this.game;
    const fd = player.facingDir;
    const inCone = (pos, range = SPRAY_RANGE) => {
      const dx = pos.x - nozzle.x;
      const dz = pos.z - nozzle.z;
      const d = Math.hypot(dx, dz);
      if (d > range) return false;
      if (d < 0.7) return true;
      return (dx * fd.x + dz * fd.z) / d > SPRAY_DOT;
    };
    const eye = player.pos.clone().setY(1.2);
    for (const g of game.ghosts) {
      if (!g.alive || g.room !== game.currentRoomId || !g.visible || !g.elementHit) continue;
      if (!inCone(g.pos) || !this.mansion.lineOfSight(eye, g.pos)) continue;
      g.elementHit(this.type, game, dt);
    }
    if (this.type !== 'fire') return;
    for (const c of this.candles) {
      if (c.lit || c.room !== game.currentRoomId || !inCone(c.wick, SPRAY_RANGE - 0.6)) continue;
      c.heat += dt;
      if (c.heat > 0.3) this.lightCandle(c);
    }
  }

  lightCandle(c, silent = false) {
    if (c.lit) return;
    c.lit = true;
    c.flame.visible = true;
    c.light = this.mansion.addLight(c.wick.x, 1.9, c.wick.z, 0xffb060, 2.6, 6, 1.7, c.room, { flickerAmt: 0.35 });
    if (silent) return;
    const game = this.game;
    game.sound.candleLight();
    game.fx.sparkle(c.wick, 0xffd080, 8);
    const set = c.set;
    const lit = set.candles.filter((k) => k.lit).length;
    if (lit < set.candles.length) {
      game.hud.toast(`🕯️ Candle lit — ${lit}/${set.candles.length}`, 'info');
      return;
    }
    // the whole room glows: treasure tumbles out of thin air
    this.solved.add(set.def.id);
    const room = this.mansion.rooms[set.room];
    const at = new THREE.Vector3(room.cx, 1.6, room.cz);
    game.loot.spawn(at, set.def.reward, game.player.stats.luck, 1.2);
    game.fx.sparkle(at, 0xffd23a, 30);
    game.sound.chime('gem');
    game.hud.toast(`🕯️ Every candle in the ${set.def.name} is burning! Treasure appeared!`, 'sticker');
    if (this.solved.size >= CANDLE_SETS.length) game.unlock('candle_keeper');
  }

  // ---------------------------------------------------------------
  // ghost reactions (called from Ghost via the game). The full explanation
  // is shown when the ghost first appears; the beam just gets a reminder.
  onImmune(g) {
    const game = this.game;
    const weak = { fire: 'water', water: 'ice', ice: 'fire' }[g.element];
    if (!this.tips['immune_' + g.element]) {
      this.tips['immune_' + g.element] = true;
      this.toastCool = 4; // let the first-meeting tip be read first
    } else if (this.toastCool <= 0) {
      this.toastCool = 6;
      game.hud.toast(`Light won't work — spray it with ${ELEMENTS[weak].icon} ${ELEMENTS[weak].name}!`, 'danger');
    }
  }

  onFed(g, type) {
    const game = this.game;
    game.sound.giggle();
    if (this.toastCool > 0) return;
    this.toastCool = 4;
    const weak = { fire: 'water', water: 'ice', ice: 'fire' }[g.element];
    game.hud.toast(`It slurped up your ${ELEMENTS[type].name}! Try ${ELEMENTS[weak].icon} ${ELEMENTS[weak].name}.`, 'danger');
  }

  onStun(g, type) {
    const game = this.game;
    game.rig.shake(0.3);
    game.hud.screenFlash(0.15);
    game.unlock('elemental_stun');
  }

  onCaptured(g) {
    if (!g.element) return;
    this.caughtKinds.add(g.element);
    if (this.caughtKinds.size >= 3) this.game.unlock('elementalist');
  }

  // ---------------------------------------------------------------
  // particles
  nextPart() {
    const p = this.parts[this.cursor];
    this.cursor = (this.cursor + 1) % this.N;
    return p;
  }

  spawnSpray(type, from, dir) {
    const e = ELEMENTS[type];
    const p = this.nextPart();
    p.alive = true;
    p.suck = false;
    p.p.copy(from);
    const sp = e.speed * (0.75 + Math.random() * 0.5);
    p.v.set(dir.x + (Math.random() - 0.5) * e.spread * 2, (Math.random() - 0.3) * e.spread, dir.z + (Math.random() - 0.5) * e.spread * 2).normalize().multiplyScalar(sp);
    if (type === 'water') p.v.y += 2.2; // a lobbed arc
    p.g = e.gravity;
    p.max = p.life = e.life * (0.7 + Math.random() * 0.5);
    p.col.copy(e.a).lerp(e.b, Math.random());
  }

  spawnSuck(type, at) {
    const e = ELEMENTS[type];
    const p = this.nextPart();
    p.alive = true;
    p.suck = true;
    p.p.set(at.x + (Math.random() - 0.5) * 0.6, at.y + (Math.random() - 0.3) * 0.5, at.z + (Math.random() - 0.5) * 0.6);
    p.v.set(0, 0, 0);
    p.max = p.life = 1.2;
    p.col.copy(e.a).lerp(e.b, Math.random());
  }

  updateParticles(dt, nozzle) {
    const P = this.posArr;
    const C = this.colArr;
    for (let i = 0; i < this.N; i++) {
      const p = this.parts[i];
      if (p.alive) {
        p.life -= dt;
        if (p.suck) {
          // home in on the nozzle, faster as it gets closer
          const to = this.tmp.copy(nozzle).sub(p.p);
          const d = to.length();
          if (d < 0.3) p.life = 0;
          p.v.lerp(to.multiplyScalar(9 / Math.max(0.3, d)), Math.min(1, dt * 8));
        } else {
          p.v.y -= p.g * dt;
          if (p.p.y < 0.05 && p.v.y < 0) {
            p.p.y = 0.05;
            p.v.y *= -0.2;
            p.v.x *= 0.5;
            p.v.z *= 0.5;
          }
        }
        p.p.addScaledVector(p.v, dt);
        if (p.life <= 0) p.alive = false;
      }
      if (!p.alive) {
        P[i * 3 + 1] = -100;
        continue;
      }
      const k = p.suck ? 1 : Math.min(1, (p.life / p.max) * 1.6);
      P[i * 3] = p.p.x;
      P[i * 3 + 1] = p.p.y;
      P[i * 3 + 2] = p.p.z;
      C[i * 3] = p.col.r * k;
      C[i * 3 + 1] = p.col.g * k;
      C[i * 3 + 2] = p.col.b * k;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }

  // a lit room with cold candles: point the hero at the nearest fire. Waits
  // until the room's ghosts are gone so it doesn't bury the fight tips.
  onEnterRoom(roomId) {
    const set = this.sets.find((s) => s.room === roomId);
    if (!set || this.solved.has(set.def.id) || this.tips['candles_' + set.def.id]) return;
    if (!this.game.clearedRooms.has(roomId)) return;
    this.tips['candles_' + set.def.id] = true;
    const n = set.candles.length;
    this.game.showTip(`🕯️ ${n} cold candles stand around the ${set.def.name}. Vacuum up <b>fire</b> from the fireplace, then ${this.game.btn('hold <kbd>Q</kbd>', 'hold <kbd>Y</kbd>')} to light them all.`, 7);
  }

  hudState() {
    return { type: this.type, amount: this.amount, absorbing: !!this.absorbing && !(this.type === this.absorbing.type && this.amount >= 1), spraying: this.spraying };
  }

  dispose() {
    this.game.sound.setSpray(null);
  }
}
