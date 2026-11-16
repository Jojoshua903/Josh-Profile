// ==========================================================
// Ghost.js — ghost AI: hiding, appearing, roaming, wind-up &
// lunge attacks, stunned (heart exposed), tug-of-war struggle,
// capture; plus Grumbleclaw's Boss AI (eat / alert / angry).
// ==========================================================
import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { CONFIG } from '../config.js';
import { buildGhost, buildBoss, buildPortraitGhost, buildBoo } from '../graphics/models.js';
import { lerpAngle } from './Player.js';

let GHOST_ID = 0;

// Finite-state machine states (string values are used throughout the game)
export const GhostState = {
  HIDING: 'hidden',          // invisible, waiting for the hero to come close
  APPEARING: 'appearing',    // fading in with a shriek
  ALERTED: 'alerted',        // just noticed the hero: eyes flare
  ROAMING: 'roam',           // drifting, stalking, sneaking up from behind
  WINDUP: 'windup',          // rearing back before a lunge (vulnerable)
  LUNGE: 'lunge',            // attack dash (vulnerable)
  RECOVER: 'recover',        // laughing after an attack (vulnerable)
  VANISHING: 'vanish',       // flashed too early: ducks out of sight
  STUNNED: 'stunned',        // heart exposed & pulsing
  BEING_VACUUMED: 'tug',     // tug-of-war struggle
  ESCAPING: 'escape',        // broke free of the vacuum
  CAPTURED: 'captured',      // shrinking into the nozzle
};

// states in which a flash in the face stuns a standard ghost
const VULNERABLE = new Set([GhostState.WINDUP, GhostState.LUNGE, GhostState.RECOVER, GhostState.ESCAPING]);

// what the Tossing Ghost hurls: books and vases from the shelves
const MISSILE_GEO = {
  book: new THREE.BoxGeometry(0.34, 0.1, 0.26),
  vase: new THREE.CylinderGeometry(0.1, 0.16, 0.36, 7),
};
const MISSILE_MATS = [0x7a1a28, 0x1f3f8f, 0x2e7d3a, 0xd6a647].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, flatShading: true }));

// element ghosts shrug off the flashlight; only this element stuns them
export const ELEMENT_WEAKNESS = { fire: 'water', water: 'ice', ice: 'fire' };
// what drifts off an element ghost: embers rise, drips fall, frost hangs
const ELEMENT_AURA = {
  fire: { color: 0xffa040, up: 2.2, gravity: 0, life: 0.6 },
  water: { color: 0x6ab8ff, up: 0.2, gravity: 6, life: 0.7 },
  ice: { color: 0xdff8ff, up: 0.4, gravity: 0.4, life: 1.1 },
};

export class Ghost {
  constructor(scene, { kind = 'gold', room, spawn, hp = CONFIG.ghost.hp, autoAppear = true, damage = CONFIG.ghost.attackDamage, value = CONFIG.ghost.captureValue, dodgy = false, speedMult = 1, forgiving = false, loot = null, style = 'lunge', element = null } = {}) {
    this.id = ++GHOST_ID;
    this.scene = scene;
    this.kind = kind;
    this.room = room;
    this.isBoss = false;
    this.forgiving = forgiving; // tutorial ghost: stunnable at any time
    // attack style: 'lunge' (dash at you), 'punch' (big haymaker; heart only
    // shows AFTER the swing), 'throw' (hurls objects from a distance)
    this.style = style;
    // 'fire' / 'water' / 'ice': ignores the light, stunned by its weakness
    this.element = element;
    this.soak = 0;
    this.fedTimer = 0;
    this.missiles = [];
    this.lootTable = loot || { coin: 6, bill: 2, pearl: 0.5 };
    this.build();
    if (style === 'throw') {
      // the object it's about to hurl, held overhead during the windup
      this.held = new THREE.Mesh(MISSILE_GEO.book, MISSILE_MATS[0]);
      this.held.position.set(0, 1.45, 0);
      this.held.visible = false;
      this.group.add(this.held);
    }
    this.pos = this.group.position;
    this.pos.copy(spawn);
    this.home = spawn.clone();
    this.maxHp = hp;
    this.hp = hp;
    this.damage = damage;
    this.value = value;
    this.dodgy = dodgy;
    this.speedMult = speedMult;
    this.autoAppear = autoAppear;
    this.state = 'hidden';
    this.stateTime = 0;
    this.opacity = 0;
    this.stunTimer = 0;
    this.chill = 0;
    this.attackCooldown = 1.5 + Math.random();
    this.vel = new THREE.Vector3();
    this.wander = spawn.clone();
    this.wanderTimer = 0;
    this.fleeDir = new THREE.Vector3(0, 0, 1);
    this.thrashTimer = 0;
    this.lungeDir = new THREE.Vector3();
    this.roomTime = 0;
    this.faceAngle = 0;
    this.alive = true;
    this.captureT = 0;
    this.bob = Math.random() * 10;
    this.tmp = new THREE.Vector3();
    this.eye = new THREE.Vector3();
    this.applyOpacity(0);
    this.group.visible = false;
    scene.add(this.group);
  }

  build() {
    this.model = buildGhost(this.kind);
    this.group = this.model.group;
    this.name = this.model.name;
  }

  get visible() {
    return this.state !== 'hidden' && this.state !== 'captured' && this.opacity > 0.2;
  }

  get stunned() {
    return this.state === 'stunned';
  }

  applyOpacity(o) {
    const m = this.model;
    m.bodyMat.opacity = 0.72 * o;
    if (m.armMat) m.armMat.opacity = 0.72 * o;
    m.glow.material.opacity = 0.4 * o;
    if (m.eyeGlow) m.eyeGlow.material.opacity = 0.7 * o;
    this.group.visible = o > 0.01;
  }

  setState(s) {
    this.state = s;
    this.stateTime = 0;
    this.dodgeRolled = false;
    if (this.held && s !== 'windup') this.held.visible = false;
  }

  // can the flashlight stun us right now? Punchers only open up AFTER
  // they've swung; everyone else from the windup onward
  isVulnerable() {
    if (this.style === 'punch') return this.state === 'recover' || this.state === 'escape';
    return VULNERABLE.has(this.state);
  }

  // Tossing Ghost: lob the held book / vase at where the hero is heading
  throwMissile(game) {
    const player = game.player;
    const mesh = new THREE.Mesh(this.held.geometry, this.held.material);
    mesh.position.copy(this.pos).setY(this.pos.y + 1.2);
    mesh.castShadow = true;
    this.scene.add(mesh);
    const lead = player.vel.clone().multiplyScalar(0.35);
    const to = new THREE.Vector3(player.pos.x + lead.x - mesh.position.x, 0, player.pos.z + lead.z - mesh.position.z);
    const flat = Math.max(0.5, to.length());
    const speed = 9;
    const time = flat / speed;
    const vel = to.normalize().multiplyScalar(speed);
    vel.y = (1.0 - mesh.position.y) / time + 4.9 * time; // arc down to chest height
    this.missiles.push({ mesh, vel, life: 3 });
    if (game.sound) game.sound.plateThrow();
  }

  updateMissiles(dt, game) {
    if (!this.missiles.length) return;
    const player = game.player;
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];
      m.life -= dt;
      m.vel.y -= 9.8 * dt;
      m.mesh.position.addScaledVector(m.vel, dt);
      m.mesh.rotation.x += dt * 9;
      m.mesh.rotation.z += dt * 5;
      const p = m.mesh.position;
      const hitPlayer = Math.abs(p.y - 1) < 1 && Math.hypot(p.x - player.pos.x, p.z - player.pos.z) < 0.75;
      const before = p.clone();
      const hitWall = game.mansion.resolveCircle(p, 0.2, true);
      if (hitPlayer || hitWall || p.y < 0.1 || m.life <= 0 || !this.alive) {
        if (hitPlayer) player.takeDamage(this.damage, before, game);
        if (game.sound) game.sound.plateCrash();
        if (game.fx) game.fx.puff(p, 0xd8c8a8, 8);
        this.scene.remove(m.mesh);
        this.missiles.splice(i, 1);
      }
    }
  }

  appear(game) {
    if (this.state !== 'hidden') return;
    this.setState('appearing');
    this.group.visible = true;
    if (game && game.sound) game.sound.shriek(this.kind === 'pink' ? 1.3 : this.kind === 'blue' ? 0.85 : 1);
    if (game && game.fx) game.fx.puff(this.pos, this.model.color, 18);
    if (game && game.onGhostAppeared) game.onGhostAppeared(this);
  }

  // ---------------------------------------------------------------
  // light response: returns true if stunned. `surge` is the bright burst
  // from switching the light on with a full charge; otherwise this is the
  // steady beam, checked every frame while the ghost sits in it.
  tryStun(player, game, surge = false) {
    if (!this.visible || this.state === 'tug' || this.state === 'stunned' || this.state === 'captured' || this.state === 'vanish') return false;
    if (this.element && !this.forgiving) {
      // element ghosts don't flinch at the light — they need their weakness
      if (game.onElementImmune) game.onElementImmune(this);
      return false;
    }
    if (this.dodgy && this.state === 'recover' && !this.dodgeRolled) {
      this.dodgeRolled = true;
      if (Math.random() < 0.3) {
        // pink speedster blinks away, giggling
        this.dodgeAway(player, game);
        return false;
      }
    }
    if (!this.forgiving && !this.isVulnerable()) {
      // a surge in its face before its heart shows: the ghost ducks out of sight
      if (surge) this.vanish(game);
      return false;
    }
    this.stun(player, game);
    return true;
  }

  stun(player, game) {
    this.stunTimer = CONFIG.flashlight.stunDuration;
    this.chill = player.stats.chill;
    this.setState('stunned');
    this.model.heart.visible = true;
    this.model.setHeart(this.hp);
    if (game.sound) game.sound.stun();
    if (game.fx) {
      game.fx.stars(this.pos, 0xfff36b);
      if (this.chill > 0) game.fx.puff(this.pos, 0xbfefff, 20);
    }
  }

  // sprayed with an element from the Poltergust. Its weakness stuns it at
  // ANY moment (no need to wait for an attack); its own element feeds it.
  elementHit(type, game, dt) {
    if (!this.element || !this.visible || this.state === 'tug' || this.state === 'stunned' || this.state === 'captured') return false;
    if (type === this.element) {
      if (this.fedTimer <= 0) {
        this.fedTimer = 2.5;
        this.hp = Math.min(this.maxHp, this.hp + 10);
        if (game.fx) game.fx.puff(this.pos, this.model.color, 14);
        if (game.onElementFed) game.onElementFed(this, type);
      }
      return false;
    }
    if (type !== ELEMENT_WEAKNESS[this.element]) {
      // splashes off harmlessly
      if (game.fx && Math.random() < dt * 6) game.fx.puff(this.pos, this.model.color, 3);
      return false;
    }
    this.soak += dt * 2;
    if (this.soak < 0.6) return false;
    this.soak = 0;
    if (this.state === 'vanish' || this.state === 'appearing') this.opacity = 1;
    this.stun(game.player, game);
    if (game.sound) game.sound.sizzle();
    if (game.fx) game.fx.puff(this.pos, type === 'fire' ? 0xffffff : 0xdff8ff, 22); // steam / frost burst
    if (game.onElementStun) game.onElementStun(this, type);
    return true;
  }

  updateElementAura(dt, game) {
    this.fedTimer -= dt;
    this.soak = Math.max(0, this.soak - dt * 0.5);
    if (!this.visible || this.state === 'captured' || !game.fx || game.currentRoomId !== this.room) return;
    if (Math.random() > dt * 9) return;
    const a = ELEMENT_AURA[this.element];
    const p = this.pos.clone();
    p.x += (Math.random() - 0.5) * 0.9;
    p.z += (Math.random() - 0.5) * 0.9;
    p.y += Math.random() * 0.8;
    game.fx.emit(p, a.color, 1, { speed: 0.3, up: a.up, life: a.life, size: 0.22, gravity: a.gravity, spread: 0.1 });
  }

  dodgeAway(player, game) {
    const room = game.mansion.rooms[this.room];
    const a = Math.random() * Math.PI * 2;
    const nx = THREE.MathUtils.clamp(this.pos.x + Math.cos(a) * 4, room.minX + 1.5, room.maxX - 1.5);
    const nz = THREE.MathUtils.clamp(this.pos.z + Math.sin(a) * 4, room.minZ + 1.5, room.maxZ - 1.5);
    if (game.fx) game.fx.puff(this.pos, this.model.color, 10);
    this.pos.set(nx, this.pos.y, nz);
    if (game.sound) game.sound.giggle();
    if (game.hud) game.hud.toast('It dodged! Catch it while it attacks.', 'info');
  }

  vanish(game) {
    this.setState('vanish');
    this.vanishMoved = false;
    if (game.sound) game.sound.giggle();
    if (game.fx) game.fx.puff(this.pos, this.model.color, 12);
    if (game.hud) game.hud.toast('Too early! It hid. Wait for its HEART to show.', 'danger');
  }

  // spawn the ghost's treasure (Fionn's luck stat boosts it)
  dropLoot(game) {
    if (!game.loot) return;
    const luck = game.player ? game.player.stats.luck : 1;
    const origin = this.pos.clone().setY(1.2);
    game.loot.spawn(origin, this.lootTable, luck, this.isBoss ? 1.4 : 1);
    // a big uninterrupted pull (100+ HP in one go) shakes loose a bonus pearl
    if (this.onePull) game.loot.spawn(origin, { pearl: 1 }, 1, 1);
  }

  startTug(player, game) {
    this.setState('tug');
    this.thrashTimer = 0;
    this.tugStartHp = this.hp;
    this.tugCount = (this.tugCount || 0) + 1; // portrait frames reward catching a boss in one tug
    this.groupOffset = 0;
    this.pickFleeDir(player);
    player.latch(this);
    if (game.sound) game.sound.shriek(1.4);
    if (game.rig) game.rig.shake(0.25);
  }

  // dragged into a pull that's already going: thrashes alongside the lead
  // ghost (slightly fanned out), so one counter-pull works on the whole group
  joinTug(player, game) {
    this.setState('tug');
    this.tugStartHp = this.hp;
    this.groupOffset = (player.extraLatched.length % 2 ? -1 : 1) * 0.45;
    player.joinTug(this);
    this.followLead(player.latched);
    if (game.sound) game.sound.shriek(1.6);
    if (game.rig) game.rig.shake(0.3);
    if (game.onGhostJoinedTug) game.onGhostJoinedTug(this, 1 + player.extraLatched.length);
  }

  followLead(lead) {
    const c = Math.cos(this.groupOffset);
    const s = Math.sin(this.groupOffset);
    this.fleeDir.set(lead.fleeDir.x * c - lead.fleeDir.z * s, 0, lead.fleeDir.x * s + lead.fleeDir.z * c);
  }

  pickFleeDir(player) {
    const away = this.tmp.set(this.pos.x - player.pos.x, 0, this.pos.z - player.pos.z);
    if (away.lengthSq() < 0.01) away.set(0, 0, -1);
    away.normalize();
    const side = (Math.random() - 0.5) * 2.4;
    this.fleeDir.set(away.x + -away.z * side, 0, away.z + away.x * side).normalize();
  }

  // pull vector applied to the player during tug-of-war
  currentPull(out) {
    const strength = (this.isBoss ? CONFIG.boss.pullStrength : CONFIG.ghost.pullStrength) * (1 - this.chill * 0.5);
    return out.copy(this.fleeDir).multiplyScalar(strength);
  }

  onLatchBroken(game, byDamage, quiet = false) {
    if (this.state !== 'tug') return;
    this.model.heart.visible = false;
    this.setState('escape');
    if (game && game.sound && !quiet) game.sound.giggle();
    if (game && game.hud && !quiet) game.hud.toast(byDamage ? 'Knocked loose! The ghost escaped.' : 'It broke free!', 'danger');
  }

  // ---------------------------------------------------------------
  update(dt, game, t) {
    if (!this.alive) {
      if (this.missiles.length) this.updateMissiles(dt, game); // clears anything still in the air
      return;
    }
    const player = game.player;
    const cfg = CONFIG.ghost;
    this.stateTime += dt;
    this.attackCooldown -= dt;
    if (this.element) this.updateElementAura(dt, game);
    const dx = player.pos.x - this.pos.x;
    const dz = player.pos.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    const sameRoom = game.currentRoomId === this.room;
    const room = game.mansion.rooms[this.room];

    switch (this.state) {
      case 'hidden': {
        if (sameRoom) this.roomTime += dt;
        const detect = cfg.detectRadius * player.stats.noise;
        if (this.autoAppear && sameRoom && (dist < detect || this.roomTime > 4 + 5 * (1 - player.stats.noise))) this.appear(game);
        break;
      }
      case 'appearing': {
        this.opacity = Math.min(1, this.stateTime / 0.9);
        this.pos.y = cfg.floatHeight + (1 - this.opacity) * 1.5;
        if (this.stateTime > 0.9) {
          this.setState('alerted');
          if (game.sound) game.sound.warble(this.kind === 'pink' ? 1.4 : 1.1);
        }
        break;
      }
      case 'alerted': {
        // spots the hero: freezes mid-air, eyes flare, then starts stalking
        this.opacity = 1;
        this.pos.y = cfg.floatHeight + 0.15 + Math.sin(this.stateTime * 18) * 0.04;
        if (this.stateTime > 0.75) this.setState('roam');
        break;
      }
      case 'vanish': {
        // flashed too early: fade out, slip somewhere else, reappear later
        if (this.stateTime < 0.4) {
          this.opacity = Math.max(0, 1 - this.stateTime / 0.4);
        } else if (!this.vanishMoved) {
          this.vanishMoved = true;
          this.opacity = 0;
          this.pos.set(
            THREE.MathUtils.lerp(room.minX + 1.5, room.maxX - 1.5, Math.random()),
            cfg.floatHeight,
            THREE.MathUtils.lerp(room.minZ + 1.5, room.maxZ - 1.5, Math.random()),
          );
        } else if (this.stateTime > 0.4 + cfg.hideTime) {
          this.setState('appearing');
          if (game.sound) game.sound.shriek(this.kind === 'pink' ? 1.3 : 0.9);
        }
        break;
      }
      case 'roam': {
        this.opacity = Math.min(1, this.opacity + dt);
        // is the hero looking at us? (+1 = straight at us, -1 = back turned)
        const look = dist > 0.01 ? (-dx * player.facingDir.x + -dz * player.facingDir.z) / dist : 1;
        const sneaking = look < -0.15;
        this.sneaking = sneaking;
        this.wanderTimer -= dt;
        // in the dark the ghosts grow bold and attack sooner
        if (!player.lightOn) this.attackCooldown -= dt * 0.6;
        if (sneaking) {
          // creep up behind the hero, faster, and get ready to pounce
          this.wander.set(player.pos.x - player.facingDir.x * 1.2, 0, player.pos.z - player.facingDir.z * 1.2);
          this.attackCooldown -= dt * 0.8;
        } else if (player.lightOn && look > 0.75 && dist < 6) {
          // caught in the light's direction: drift sideways and keep distance
          if (this.wanderTimer <= 0 || Math.hypot(this.wander.x - this.pos.x, this.wander.z - this.pos.z) < 0.5) {
            this.wanderTimer = 0.8;
            const side = Math.random() < 0.5 ? -1 : 1;
            this.wander.set(this.pos.x - dz / dist * 3 * side - dx / dist * 1.5, 0, this.pos.z + dx / dist * 3 * side - dz / dist * 1.5);
          }
        } else if (this.wanderTimer <= 0) {
          this.wanderTimer = 1.4 + Math.random() * 1.8;
          const towardPlayer = Math.random() < 0.55;
          if (towardPlayer) this.wander.set(player.pos.x + (Math.random() - 0.5) * 4, 0, player.pos.z + (Math.random() - 0.5) * 4);
          else this.wander.set(THREE.MathUtils.lerp(room.minX + 1.5, room.maxX - 1.5, Math.random()), 0, THREE.MathUtils.lerp(room.minZ + 1.5, room.maxZ - 1.5, Math.random()));
        }
        this.moveToward(this.wander, cfg.speed * this.speedMult * (sneaking ? 1.6 : 1), dt);
        if (sameRoom && game.sound && Math.random() < dt * 0.15) game.sound.warble(this.kind === 'pink' ? 1.3 : this.kind === 'blue' ? 0.8 : 1);
        this.pos.y = cfg.floatHeight + Math.sin(t * 2 + this.bob) * 0.25;
        if (this.style === 'throw') {
          // keeps its distance, then hurls something from across the room
          if (dist < 5) this.wander.set(this.pos.x - (dx / dist) * 3, 0, this.pos.z - (dz / dist) * 3);
          this.eye.copy(this.pos).setY(1.2);
          if (sameRoom && dist > 3.5 && dist < 11 && this.attackCooldown <= 0 && game.mansion.lineOfSight(this.eye, player.pos.clone().setY(1.2))) {
            this.setState('windup');
            this.lungeDir.set(dx, 0, dz).normalize();
            this.held.material = MISSILE_MATS[Math.floor(Math.random() * MISSILE_MATS.length)];
            this.held.geometry = Math.random() < 0.5 ? MISSILE_GEO.book : MISSILE_GEO.vase;
          }
        } else if (sameRoom && dist < (this.style === 'punch' ? 3.4 : 4.2) && this.attackCooldown <= 0) {
          this.setState('windup');
          this.lungeDir.set(dx, 0, dz).normalize();
          if (this.style === 'punch' && game.sound) game.sound.warble(0.6);
        }
        break;
      }
      case 'windup': {
        // rears back, arms up, eyes flare (the puncher cocks a giant fist)
        const windup = this.style === 'punch' ? 0.95 : this.style === 'throw' ? 0.75 : cfg.windupTime;
        if (this.style !== 'throw') {
          this.pos.x -= this.lungeDir.x * dt * 0.8;
          this.pos.z -= this.lungeDir.z * dt * 0.8;
        }
        this.pos.y = cfg.floatHeight + 0.3 + Math.sin(this.stateTime * 30) * 0.05;
        if (this.held) this.held.visible = true;
        if (this.stateTime > windup) {
          this.lungeDir.set(dx, 0, dz).normalize();
          if (this.style === 'throw') {
            this.throwMissile(game);
            this.setState('recover');
            this.attackCooldown = cfg.attackCooldown * 1.1;
          } else {
            this.setState('lunge');
            if (game.sound) game.sound.shriek(this.style === 'punch' ? 0.8 : 1.15);
          }
        }
        break;
      }
      case 'lunge': {
        // the puncher's swing is a short, heavy jab with extra reach
        const punch = this.style === 'punch';
        const sp = cfg.lungeSpeed * this.speedMult * (punch ? 0.8 : 1);
        this.pos.x += this.lungeDir.x * sp * dt;
        this.pos.z += this.lungeDir.z * sp * dt;
        this.pos.y = cfg.floatHeight - 0.2;
        const reach = cfg.attackRange + player.radius + (punch ? 0.7 : 0);
        if (dist < reach) {
          if (player.takeDamage(this.damage, this.pos, game)) {
            if (game.fx) game.fx.puff(player.pos, 0xff4f7a, 12);
            if (punch) {
              player.knock.multiplyScalar(1.8);
              if (game.rig) game.rig.shake(0.35);
              if (game.sound) game.sound.thud();
            }
          }
          this.setState('recover');
          this.attackCooldown = cfg.attackCooldown;
        } else if (this.stateTime > (punch ? 0.35 : 0.55)) {
          this.setState('recover');
          this.attackCooldown = cfg.attackCooldown;
          if (punch && game.sound) game.sound.thud(); // whiffed
        }
        break;
      }
      case 'recover': {
        // laughing, tongue out: wide open to the flashlight. The puncher is
        // left dizzy after its swing — its only opening.
        this.pos.y = cfg.floatHeight + Math.sin(t * 6) * 0.15;
        if (this.held) this.held.visible = false;
        if (this.style === 'punch' && game.fx && Math.random() < dt * 6) game.fx.sparkle(this.pos.clone().setY(this.pos.y + 1.1), 0xfff36b, 1);
        const openFor = this.style === 'punch' ? 1.5 : this.style === 'throw' ? 1.0 : cfg.vulnerableWindow;
        if (this.stateTime > openFor) this.setState('roam');
        break;
      }
      case 'stunned': {
        this.stunTimer -= dt;
        this.pos.y = cfg.floatHeight + Math.sin(t * 3) * 0.08;
        if (player.canLatch() && dist < CONFIG.vacuum.latchRange) {
          const dot = (dx * -player.facingDir.x + dz * -player.facingDir.z) / Math.max(0.01, dist);
          if (dot > 0.55 || dist < 1.8) this.startTug(player, game);
        } else if (player.canJoinTug() && player.latched !== this && player.latched.room === this.room && dist < CONFIG.vacuum.joinRange) {
          // already reeling one in: a stunned ghost near the nozzle gets dragged into the same pull
          const dot = (dx * -player.facingDir.x + dz * -player.facingDir.z) / Math.max(0.01, dist);
          if (dot > 0.25 || dist < 2.4) this.joinTug(player, game);
        }
        if (this.state === 'stunned' && this.stunTimer <= 0) {
          this.model.heart.visible = false;
          this.setState('roam');
          this.attackCooldown = 0.4;
          if (game.sound) game.sound.giggle();
        }
        break;
      }
      case 'tug':
        this.updateTug(dt, game, t, dist, dx, dz);
        break;
      case 'escape': {
        this.pos.x += this.fleeDir.x * 6 * dt;
        this.pos.z += this.fleeDir.z * 6 * dt;
        this.pos.y = cfg.floatHeight + 0.4;
        this.opacity = Math.max(0.35, 1 - this.stateTime);
        if (this.stateTime > 1.1) {
          this.setState('roam');
          this.attackCooldown = 1.0;
        }
        break;
      }
      case 'captured':
        this.updateCapture(dt, game);
        break;
      default:
        break;
    }

    // keep ghosts inside their room
    if (this.state !== 'captured' && room) {
      this.pos.x = THREE.MathUtils.clamp(this.pos.x, room.minX + 0.8, room.maxX - 0.8);
      this.pos.z = THREE.MathUtils.clamp(this.pos.z, room.minZ + 0.8, room.maxZ - 0.8);
    }

    this.updateMissiles(dt, game);
    this.animate(dt, t, dist, dx, dz);
  }

  moveToward(target, speed, dt) {
    const tx = target.x - this.pos.x;
    const tz = target.z - this.pos.z;
    const d = Math.hypot(tx, tz);
    if (d > 0.1) {
      this.vel.x += ((tx / d) * speed - this.vel.x) * Math.min(1, dt * 2);
      this.vel.z += ((tz / d) * speed - this.vel.z) * Math.min(1, dt * 2);
    } else {
      this.vel.multiplyScalar(1 - Math.min(1, dt * 3));
    }
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
  }

  updateTug(dt, game, t, dist, dx, dz) {
    const player = game.player;
    const cfg = CONFIG.ghost;
    const chillSlow = 1 - this.chill * 0.5;
    const lead = player.latched;
    const isLead = lead === this;
    if (!isLead && !player.extraLatched.includes(this)) {
      // the pull ended without us (e.g. the hero was knocked loose)
      this.onLatchBroken(game, false, true);
      return;
    }
    if (isLead) {
      this.thrashTimer -= dt * chillSlow;
      if (this.thrashTimer <= 0) {
        this.thrashTimer = cfg.thrashInterval * (0.7 + Math.random() * 0.6) * (this.isBoss ? 1.2 : 1);
        this.pickFleeDir(player);
        if (Math.random() < 0.4 && game.sound) game.sound.shriek(this.isBoss ? 0.6 : 1.2);
      }
    } else {
      this.followLead(lead);
    }
    // ghost thrashes away while the vacuum reels it in
    const flee = (this.isBoss ? 3.2 : 3.6) * chillSlow;
    const suck = 2.6 * player.stats.suction;
    const ax = -dx / Math.max(0.01, dist);
    const az = -dz / Math.max(0.01, dist);
    this.pos.x += (this.fleeDir.x * flee - ax * suck) * dt;
    this.pos.z += (this.fleeDir.z * flee - az * suck) * dt;
    const minDist = this.isBoss ? 3.0 : 2.2;
    if (dist < minDist) {
      this.pos.x = player.pos.x - ax * minDist;
      this.pos.z = player.pos.z - az * minDist;
    }
    this.pos.y = (this.isBoss ? 1.8 : cfg.floatHeight) + Math.sin(t * 14) * 0.08;

    // damage: pulling opposite the ghost's flee direction drains HP faster
    const input = player.tugInput;
    const opposition = Math.max(0, -(input.x * this.fleeDir.x + input.z * this.fleeDir.z));
    if (isLead) {
      if (opposition > 0.6) player.pullStreak += dt;
      else player.pullStreak = Math.max(0, player.pullStreak - dt * 2);
    }
    let dps = CONFIG.vacuum.baseDps * player.stats.suction * (1 + CONFIG.vacuum.oppositionBonus * opposition);
    if (player.char.id === 'nathan' && player.pullStreak > 0.5) dps *= 1.25;
    if (player.extraLatched.length) dps *= CONFIG.vacuum.groupDps; // the suction is shared
    this.hp -= dps * dt * player.vacuumPower;
    this.lastOpposition = opposition;
    this.model.setHeart(Math.max(0, this.hp));
    if (player.char.id === 'milo' && Math.random() < dt * 8) {
      if (game.sound) game.sound.zap();
      if (game.fx) game.fx.spark(this.pos, 0xfff36b, 3);
    }
    if (isLead && game.rig && Math.random() < dt * 4) game.rig.shake(0.08 * (1 + player.extraLatched.length * 0.5));

    if (this.hp <= 0) {
      this.hp = 0;
      this.beginCapture(game);
      return;
    }
    if (dist > CONFIG.vacuum.breakDistance) {
      if (isLead) {
        player.release();
        this.onLatchBroken(game, false);
      } else {
        // a straggler slips away on its own; the rest of the pull holds
        player.detach(this);
        this.onLatchBroken(game, false);
      }
    }
  }

  beginCapture(game) {
    this.setState('captured');
    this.captureT = 0;
    this.onePull = (this.tugStartHp || 0) >= 100;
    // order of this catch within one continuous pull (2nd, 3rd = combo bonus)
    const session = game.player.tugSession;
    if (session) {
      session.caught++;
      this.comboIndex = session.caught;
      this.comboPeak = session.peak;
    } else {
      this.comboIndex = 1;
    }
    this.model.heart.visible = false;
    game.player.detach(this);
    if (game.sound) game.sound.capture(this.isBoss);
    this.captureStart = this.pos.clone();
  }

  updateCapture(dt, game) {
    this.captureT += dt / 0.75;
    const nozzle = game.player.nozzleWorld(this.tmp);
    const k = Math.min(1, this.captureT);
    const e = k * k;
    this.pos.lerpVectors(this.captureStart, nozzle, e);
    const s = Math.max(0.02, 1 - e);
    this.group.scale.setScalar(s * (this.isBoss ? 1 : 1));
    this.group.rotation.y += dt * 25;
    if (k >= 1) {
      this.alive = false;
      this.scene.remove(this.group);
      this.dropLoot(game);
      game.onGhostCaptured(this);
    }
  }

  animate(dt, t, dist, dx, dz) {
    const m = this.model;
    if (this.state !== 'captured') {
      // face the hero (or flee direction during tug)
      let target = Math.atan2(dx, dz);
      if (this.state === 'tug' || this.state === 'escape') target = Math.atan2(this.fleeDir.x, this.fleeDir.z) + Math.PI;
      this.faceAngle = lerpAngle(this.faceAngle, target, Math.min(1, dt * 5));
      this.group.rotation.y = this.faceAngle;
    }
    const inner = m.inner;
    inner.rotation.z = Math.sin(t * 2.2 + this.bob) * 0.12;
    const breathe = 1 + Math.sin(t * 3 + this.bob) * 0.04;
    inner.scale.set(breathe, 1 / breathe, breathe);

    if (m.arms) {
      const up = this.state === 'windup' ? 1 : this.state === 'tug' ? 0.6 + Math.sin(t * 20) * 0.4 : 0;
      m.arms[0].position.y = 0.3 + up * 0.5 + Math.sin(t * 4) * 0.06;
      m.arms[1].position.y = 0.3 + up * 0.5 + Math.cos(t * 4) * 0.06;
      if (this.style === 'punch') {
        // the haymaker: the fist swells while cocked back, then shoots forward
        const st = this.state;
        const fist = st === 'windup' ? Math.min(2.4, 1 + this.stateTime * 1.6) : st === 'lunge' ? 2.3 : 1.25;
        m.arms[1].scale.setScalar(fist);
        m.arms[1].position.z = st === 'lunge' ? 0.75 : st === 'windup' ? -0.35 : 0.1;
        m.arms[1].position.y = st === 'windup' || st === 'lunge' ? 0.35 : m.arms[1].position.y;
      }
    }
    if (m.tongue) m.tongue.visible = this.state === 'recover' || this.state === 'stunned';
    // the heart (with its HP count) shows whenever the ghost is open to the light
    const heartOut = this.state === 'stunned' || this.state === 'tug' || (this.isVulnerable() && this.state !== 'escape');
    m.heart.visible = heartOut && this.state !== 'tug';
    if (m.animate) m.animate(t, dt, heartOut);
    if (m.eyes) {
      const flare = this.state === 'windup' || this.state === 'lunge' || this.state === 'alerted' ? 5 : this.state === 'stunned' ? 0.8 : this.sneaking && this.state === 'roam' ? 1.2 : 3;
      m.eyes.forEach((e) => {
        e.material.emissiveIntensity = flare;
        e.scale.y = this.state === 'stunned' ? 0.4 + Math.abs(Math.sin(t * 6)) * 0.4 : 1.3;
      });
    }
    if (this.state === 'stunned') {
      inner.rotation.y += dt * 4;
      m.bodyMat.emissiveIntensity = 0.9 + Math.sin(t * 20) * 0.3;
      if (this.chill > 0) m.bodyMat.emissive.setHex(0x9feaff);
    } else {
      inner.rotation.y *= 0.9;
      m.bodyMat.emissive.setHex(m.color);
      m.bodyMat.emissiveIntensity = this.state === 'tug' ? 1.0 + Math.sin(t * 25) * 0.3 : 0.55;
    }
    if (m.heart.visible) {
      const hb = 0.7 + Math.max(0, Math.sin(t * 9)) * 0.12;
      m.heart.scale.set(hb, hb, hb);
    }
    if (this.state !== 'hidden') this.applyOpacity(this.opacity);
  }
}

// ===================================================================
// GRUMBLECLAW — Dining Room boss. Only vulnerable while distracted,
// stuffing his face at the banquet. Gets angry and hurls plates.
// ===================================================================
export class BossGhost extends Ghost {
  constructor(scene, { room, seat }) {
    super(scene, {
      kind: 'boss', room, spawn: seat.clone().setY(1.6), hp: CONFIG.boss.hp, autoAppear: false, damage: CONFIG.boss.plateDamage, value: CONFIG.boss.captureValue,
      loot: { coin: 12, bill: 6, pearl: 3, gem: 2, heart: 1 },
    });
    this.isBoss = true;
    this.seat = seat.clone().setY(1.6);
    this.plates = [];
    this.plateTimer = 0;
    this.chompTimer = 0;
    // bite cycle: he raises the food, CHOMPS, then savours it with eyes shut.
    // Only that savouring window leaves him open to the Strobulb.
    this.biteTimer = 2.2;
    this.biteWindow = 0;
    this.jawOpen = 0;
    this.alertTimer = 3 + Math.random() * 3;
    this.introduced = false;
    this.plateGeo = new THREE.CylinderGeometry(0.3, 0.24, 0.05, 12);
    this.plateMat = new THREE.MeshStandardMaterial({ color: 0xf6f2ea, emissive: 0x222222, roughness: 0.3, flatShading: true });
    this.faceAngle = -Math.PI / 2;
    this.opacity = 1;
    this.applyOpacity(1);
    this.group.visible = true;
    this.setState('eating');
  }

  build() {
    this.model = buildBoss();
    this.group = this.model.group;
    this.name = 'Grumbleclaw';
  }

  applyOpacity(o) {
    const m = this.model;
    m.bodyMat.opacity = 0.85 * o;
    m.glow.material.opacity = 0.38 * o;
    m.eyeGlow.material.opacity = 0.6 * o;
    this.group.visible = o > 0.01;
  }

  get visible() {
    return this.state !== 'captured';
  }

  get vulnerable() {
    return this.state === 'eating' && this.biteWindow > 0;
  }

  // label for the HUD boss bar
  get hudState() {
    if (this.state === 'eating') return this.biteWindow > 0 ? 'savoring' : 'eating';
    return this.state;
  }

  tryStun(player, game, surge = false, dt = 0) {
    if (this.state === 'eating' && this.biteWindow <= 0) {
      // a surge between bites, or holding the light on him too long, makes him look up
      this.litTime = (this.litTime || 0) + dt;
      if (surge || this.litTime > 1.4) {
        this.litTime = 0;
        if (game.hud) game.hud.toast(surge ? 'Wait until he takes a BITE and shuts his eyes!' : 'He noticed your light! Switch it off between bites.', 'danger');
        if (game.sound) game.sound.giggle();
        this.setState('alert');
      }
      return false;
    }
    if (this.state === 'eating') {
      this.litTime = 0;
      this.stunTimer = CONFIG.flashlight.stunDuration * 1.1;
      this.chill = player.stats.chill;
      this.setState('stunned');
      this.model.heart.visible = true;
      this.model.setHeart(this.hp);
      if (game.sound) {
        game.sound.stun();
        game.sound.bossRoar();
      }
      if (game.fx) game.fx.stars(this.pos, 0xfff36b);
      if (game.hud) game.hud.toast('Grumbleclaw is stunned! VACUUM NOW!', 'info');
      return true;
    }
    if (this.state === 'alert' && (surge || this.stateTime > 0.5)) {
      // caught him in the light while he's looking around
      if (game.hud) game.hud.toast("He spotted you! Grumbleclaw is ANGRY!", 'danger');
      this.becomeAngry(game);
    } else if (surge && (this.state === 'angry' || this.state === 'return')) {
      if (game.hud) game.hud.toast("He's too alert! Wait until he's eating.", 'danger');
    }
    return false;
  }

  becomeAngry(game) {
    this.setState('angry');
    this.model.heart.visible = false;
    this.plateTimer = 0.6;
    if (game.sound) game.sound.bossRoar();
    if (game.rig) game.rig.shake(0.5);
  }

  onLatchBroken(game, byDamage) {
    if (this.state !== 'tug') return;
    this.model.heart.visible = false;
    if (game.hud) game.hud.toast('Grumbleclaw broke free and he is FURIOUS!', 'danger');
    this.becomeAngry(game);
  }

  update(dt, game, t) {
    if (!this.alive) return;
    const player = game.player;
    const bc = CONFIG.boss;
    this.stateTime += dt;
    const dx = player.pos.x - this.pos.x;
    const dz = player.pos.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    const inRoom = game.currentRoomId === this.room;

    if (inRoom && !this.introduced) {
      this.introduced = true;
      if (game.onBossIntro) game.onBossIntro(this);
    }

    switch (this.state) {
      case 'eating': {
        this.litTime = Math.max(0, (this.litTime || 0) - dt * 0.5);
        this.pos.lerp(this.seat, Math.min(1, dt * 3));
        this.pos.y = this.seat.y + Math.sin(t * 2) * 0.06;
        this.biteWindow = Math.max(0, this.biteWindow - dt);
        this.biteTimer -= dt;
        if (this.biteTimer < 0.6 && this.biteTimer > 0) {
          // raising the drumstick, jaws wide open
          this.jawOpen = 1 - this.biteTimer / 0.6;
        } else if (this.biteTimer <= 0) {
          // CHOMP!
          this.biteTimer = 1.8 + Math.random() * 1.2;
          this.biteWindow = 1.15;
          this.jawOpen = 0;
          if (inRoom && game.sound) {
            game.sound.chomp();
            game.sound.thud();
          }
          if (game.fx) game.fx.crumbs(this.tmp.copy(this.pos).add(new THREE.Vector3(-0.9, 0, 0)));
          if (inRoom && game.rig) game.rig.shake(0.08);
        } else if (this.biteWindow > 0) {
          // happy chewing with eyes shut
          this.jawOpen = Math.abs(Math.sin(t * 12)) * 0.3;
          this.chompTimer -= dt;
          if (this.chompTimer <= 0) {
            this.chompTimer = 0.28;
            if (inRoom && game.sound) game.sound.chomp();
            if (game.fx && Math.random() < 0.5) game.fx.crumbs(this.tmp.copy(this.pos).add(new THREE.Vector3(-0.9, 0, 0)));
          }
        } else {
          this.jawOpen *= 0.85;
        }
        if (inRoom) {
          this.alertTimer -= dt;
          if (dist < bc.noticeRadius) {
            if (game.hud) game.hud.toast('Too close! He noticed you!', 'danger');
            this.becomeAngry(game);
          } else if (this.alertTimer <= 0) {
            this.setState('alert');
          } else if (this.stateTime > bc.eatTime + 4) {
            this.becomeAngry(game);
          }
        }
        break;
      }
      case 'alert': {
        // looks up from his plate; moving now will provoke him
        this.pos.y = this.seat.y + 0.2;
        if (player.speed01 > 0.35 && dist < 10 && this.stateTime > 0.35) {
          this.becomeAngry(game);
        } else if (this.stateTime > 1.5) {
          this.setState('eating');
          this.alertTimer = 2.5 + Math.random() * 3.5;
        }
        break;
      }
      case 'angry': {
        // circles the banquet hurling plates
        const a = this.stateTime * 0.7;
        const c = game.mansion.spawns.bossRoamCenter;
        const target = this.tmp.set(c.x + Math.cos(a) * 7, 0, c.z + Math.sin(a) * 4.5);
        this.moveToward(target, 3.4, dt);
        this.pos.y = 2.1 + Math.sin(t * 3) * 0.3;
        this.plateTimer -= dt;
        if (this.plateTimer <= 0 && inRoom) {
          this.plateTimer = bc.plateInterval * (0.7 + Math.random() * 0.6);
          this.throwPlate(game);
        }
        if (dist < 1.8 && player.invuln <= 0) player.takeDamage(bc.plateDamage, this.pos, game);
        if (this.stateTime > bc.angryTime) this.setState('return');
        break;
      }
      case 'return': {
        this.moveToward(this.seat, 4, dt);
        this.pos.y += (this.seat.y - this.pos.y) * Math.min(1, dt * 2);
        if (Math.hypot(this.seat.x - this.pos.x, this.seat.z - this.pos.z) < 0.4) {
          this.setState('eating');
          this.alertTimer = 3 + Math.random() * 3;
          if (game.hud && inRoom) game.hud.toast('He went back to eating... sneak a flash!', 'info');
        }
        break;
      }
      case 'stunned': {
        this.stunTimer -= dt;
        if (player.canLatch() && dist < CONFIG.vacuum.latchRange + 1) {
          const dot = (dx * -player.facingDir.x + dz * -player.facingDir.z) / Math.max(0.01, dist);
          if (dot > 0.5 || dist < 2.5) this.startTug(player, game);
        }
        if (this.state === 'stunned' && this.stunTimer <= 0) this.becomeAngry(game);
        break;
      }
      case 'tug': {
        this.updateTug(dt, game, t, dist, dx, dz);
        // he can't leave the dining room
        break;
      }
      case 'captured':
        this.updateCapture(dt, game);
        break;
      default:
        break;
    }

    const room = game.mansion.rooms[this.room];
    if (this.state !== 'captured') {
      this.pos.x = THREE.MathUtils.clamp(this.pos.x, room.minX + 1.2, room.maxX - 1.0);
      this.pos.z = THREE.MathUtils.clamp(this.pos.z, room.minZ + 1.2, room.maxZ - 1.2);
    }
    this.updatePlates(dt, game);
    this.animateBoss(dt, t, dx, dz);
  }

  throwPlate(game) {
    const player = game.player;
    const m = new THREE.Mesh(this.plateGeo, this.plateMat);
    m.position.copy(this.pos);
    m.castShadow = true;
    this.scene.add(m);
    const lead = player.vel.clone().multiplyScalar(0.3);
    const dir = new THREE.Vector3(player.pos.x + lead.x - this.pos.x, 0, player.pos.z + lead.z - this.pos.z).normalize();
    const vel = dir.multiplyScalar(CONFIG.boss.plateSpeed);
    vel.y = -0.9;
    this.plates.push({ mesh: m, vel, life: 3 });
    if (game.sound) game.sound.plateThrow();
  }

  updatePlates(dt, game) {
    const player = game.player;
    for (let i = this.plates.length - 1; i >= 0; i--) {
      const p = this.plates[i];
      p.life -= dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.position.y = Math.max(0.9, p.mesh.position.y);
      p.mesh.rotation.y += dt * 18;
      p.mesh.rotation.x = 0.4;
      const pp = p.mesh.position;
      const hitPlayer = Math.hypot(pp.x - player.pos.x, pp.z - player.pos.z) < 0.7;
      const before = pp.clone();
      const hitWall = game.mansion.resolveCircle(pp, 0.25, true);
      if (hitPlayer || hitWall || p.life <= 0) {
        if (hitPlayer) player.takeDamage(CONFIG.boss.plateDamage, before, game);
        if (game.sound) game.sound.plateCrash();
        if (game.fx) game.fx.shards(pp);
        this.scene.remove(p.mesh);
        this.plates.splice(i, 1);
      }
    }
  }

  animateBoss(dt, t, dx, dz) {
    const m = this.model;
    let target;
    if (this.state === 'eating' || this.state === 'return') target = -Math.PI / 2; // face down the table
    else if (this.state === 'tug') target = Math.atan2(this.fleeDir.x, this.fleeDir.z) + Math.PI;
    else target = Math.atan2(dx, dz);
    if (this.state !== 'captured') {
      this.faceAngle = lerpAngle(this.faceAngle, target, Math.min(1, dt * 4));
      this.group.rotation.y = this.faceAngle;
    }
    const eating = this.state === 'eating';
    m.jaw.position.y = 0.45 - (eating ? this.jawOpen * 0.2 : this.state === 'angry' ? 0.12 : 0.02);
    m.arms[1].rotation.x = eating ? -0.4 - this.jawOpen * 1.2 - (this.biteWindow > 0 ? 0.3 : 0) : this.state === 'angry' ? Math.sin(t * 10) * 1.2 : 0;
    m.arms[0].rotation.x = this.state === 'angry' ? Math.cos(t * 10) * 1.2 : eating ? -0.2 : 0;
    m.food.visible = this.state === 'eating' || this.state === 'alert';
    if (m.animate) m.animate(t, dt, this.state === 'stunned' || this.state === 'tug');
    const eyeI = this.state === 'alert' ? 6 : this.state === 'angry' ? 5 : this.state === 'stunned' ? 0.6 : 2.2;
    m.eyes.forEach((e) => {
      e.material.emissiveIntensity = eyeI;
      e.scale.y = eating ? (this.biteWindow > 0 ? 0.12 : 0.6) : this.state === 'stunned' ? 0.3 + Math.abs(Math.sin(t * 5)) * 0.3 : 1.2;
    });
    m.bodyMat.emissive.setHex(this.state === 'angry' ? 0xa01030 : this.state === 'stunned' && this.chill > 0 ? 0x6fb8ff : 0x5a1050);
    m.bodyMat.emissiveIntensity = this.state === 'tug' ? 1.0 + Math.sin(t * 25) * 0.3 : 0.7;
    const breathe = 1 + Math.sin(t * 2.5) * 0.03 + (eating ? Math.abs(Math.sin(t * 9)) * 0.02 : 0);
    m.inner.scale.set(breathe, 1 / breathe, breathe);
    if (this.state === 'stunned') m.inner.rotation.z = Math.sin(t * 6) * 0.2;
    else m.inner.rotation.z *= 0.9;
    if (m.heart.visible) {
      const hb = 1.0 + Math.max(0, Math.sin(t * 9)) * 0.15;
      m.heart.scale.set(hb, hb, hb);
    }
  }

  dispose() {
    for (const p of this.plates) this.scene.remove(p.mesh);
    this.plates.length = 0;
  }
}

// ===================================================================
// PORTRAIT GHOSTS — the area bosses of the bigger mansion. Each one is
// absorbed in an activity (playing piano, sleeping, stoking the boiler,
// painting) and only opens up during a short "tell". Holding the light
// on them while they're busy, a surge, or getting too close makes them
// look up — and if you're caught in the light or moving then, they get
// angry and attack.
// ===================================================================
export const BOSS_PROFILES = {
  sonata: {
    name: 'MADAME SONATA', title: 'the Phantom Soprano', kind: 'sonata', hp: 230, value: 20000, activity: 'piano',
    perform: [4.0, 6.0], window: 1.7, glare: 1.5, alertEvery: [5, 9], noticeRadius: 2.4, angryTime: 7.5,
    projectile: { shape: 'note', color: 0xffd23a, speed: 7.5, damage: 10, interval: 0.75, spread: 3 },
    loot: { coin: 12, bill: 6, pearl: 3, gem: 2, heart: 1 },
    intro: 'MADAME SONATA plays her haunted sonata!',
    tip: 'She\'s lost in her music. When the song ends she <b>takes a bow</b> — light her up then! Keep your light <b>off</b> her while she plays.',
    labels: {
      perform: '🎹 PLAYING — WAIT FOR THE BOW...', tell: '🙇 TAKING A BOW — LIGHT HER UP!', alert: '👀 SHE SENSES YOU — FREEZE!',
      angry: '💢 ANGRY — DODGE THE NOTES', return: 'RETURNING TO THE PIANO', stunned: '💫 STUNNED — VACUUM!', tug: '🌀 TUG-OF-WAR!', captured: 'CAPTURED!',
    },
  },
  snoozewell: {
    name: 'LORD SNOOZEWELL', title: 'the Sleeping Squire', kind: 'snoozewell', hp: 260, value: 24000, activity: 'sleep',
    perform: [3.0, 5.0], window: 2.2, glare: 0.9, alertEvery: [4, 7], noticeRadius: 2.6, angryTime: 6.5, wakeOnRun: true,
    projectile: { shape: 'pillow', color: 0xf6f2ea, speed: 8.5, damage: 12, interval: 0.6, spread: 1 },
    loot: { coin: 14, bill: 6, pearl: 3, gem: 2, heart: 1 },
    intro: 'LORD SNOOZEWELL is fast asleep...',
    tip: 'Tiptoe! Walk, don\'t run. When his snore turns into a <b>deep, rumbling snore</b>, shine your light on him. Any longer and he\'ll stir!',
    labels: {
      perform: '😴 DOZING — DON\'T WAKE HIM...', tell: '💤 DEEP SNORE — LIGHT HIM UP!', alert: '😳 STIRRING — DON\'T MOVE!',
      angry: '💢 SLEEPWALKING RAGE — DODGE THE PILLOWS', return: 'GOING BACK TO BED', stunned: '💫 STUNNED — VACUUM!', tug: '🌀 TUG-OF-WAR!', captured: 'CAPTURED!',
    },
  },
  boilerbeard: {
    name: 'BOILERBEARD', title: 'the Stoker Below', kind: 'boilerbeard', hp: 300, value: 28000, activity: 'shovel',
    perform: [3.5, 5.5], window: 1.4, glare: 1.3, alertEvery: [5, 8], noticeRadius: 3.2, angryTime: 8, charge: true,
    projectile: { shape: 'ember', color: 0xff6a1a, speed: 9.5, damage: 12, interval: 0.55, spread: 3 },
    loot: { coin: 16, bill: 8, pearl: 3, gem: 2, heart: 1 },
    intro: 'BOILERBEARD is stoking the furnace!',
    tip: 'He shovels without stopping — except to <b>wipe the sweat from his brow</b>. That\'s your moment! Watch out for his charge when he\'s angry.',
    labels: {
      perform: '⛏️ SHOVELLING COAL — WAIT...', tell: '😓 WIPING HIS BROW — LIGHT HIM UP!', alert: '👀 HE HEARD SOMETHING — FREEZE!',
      angry: '🔥 FURIOUS — DODGE EMBERS & CHARGES', return: 'BACK TO THE BOILER', stunned: '💫 STUNNED — VACUUM!', tug: '🌀 TUG-OF-WAR!', captured: 'CAPTURED!',
    },
  },
  varnish: {
    name: 'MASTER VARNISH', title: 'the Ghost Painter', kind: 'varnish', hp: 340, value: 40000, activity: 'paint',
    perform: [3.5, 5.0], window: 1.5, glare: 1.2, alertEvery: [4, 7], noticeRadius: 3.2, angryTime: 8, summon: 2,
    projectile: { shape: 'paint', color: 0x3a7aff, speed: 9, damage: 13, interval: 0.5, spread: 5 },
    loot: { coin: 20, bill: 10, pearl: 4, gem: 3, heart: 1 },
    intro: 'MASTER VARNISH — the ghost who trapped your teammate in a painting!',
    tip: 'He paints in a frenzy, then <b>steps back to admire his work</b> — light him up then! He\'ll call his ghost apprentices when he\'s hurt.',
    labels: {
      perform: '🎨 PAINTING — WAIT...', tell: '🖼️ ADMIRING HIS WORK — LIGHT HIM UP!', alert: '👀 HE SPOTTED A SMUDGE — FREEZE!',
      angry: '💢 SPLATTERING PAINT — DODGE!', return: 'BACK TO THE EASEL', stunned: '💫 STUNNED — VACUUM!', tug: '🌀 TUG-OF-WAR!', captured: 'CAPTURED!',
    },
  },
  // WIDR 64's own ghosts: a game developer who never logged off, and a kid
  // who never put his handheld down
  patchnotes: {
    name: 'PROFESSOR PATCHNOTES', title: 'the Midnight Coder', kind: 'patchnotes', hp: 200, value: 16000, activity: 'code',
    perform: [3.5, 5.5], window: 1.6, glare: 1.3, alertEvery: [5, 8], noticeRadius: 2.6, angryTime: 6.5, fakeTell: 0.35,
    projectile: { shape: 'floppy', color: 0x2a4aa8, speed: 8.5, damage: 10, interval: 0.6, spread: 3 },
    loot: { coin: 12, bill: 6, pearl: 2, gem: 1, heart: 1 },
    intro: 'PROFESSOR PATCHNOTES is coding WIDR 64 games... at 3 AM.',
    tip: 'He types until he hits <b>COMPILE</b> and leans back — when his screen glows <b>GREEN</b>, light him up! If it flashes <b>RED</b> (build failed), keep your light <b>OFF</b> him.',
    labels: {
      perform: '⌨️ CODING — WAIT FOR THE COMPILE...', tell: '✅ COMPILING — LIGHT HIM UP!', fake: '❌ BUILD FAILED — LIGHT OFF!',
      alert: '👀 HE HEARD A BUG — FREEZE!', angry: '💾 RAGE-QUIT — DODGE THE FLOPPIES', return: 'BACK TO THE KEYBOARD',
      stunned: '💫 STUNNED — VACUUM!', tug: '🌀 TUG-OF-WAR!', captured: 'CAPTURED!',
    },
  },
  pip: {
    name: 'PIXEL PIP', title: 'the Cartridge Kid', kind: 'pip', hp: 210, value: 18000, activity: 'game',
    perform: [3.0, 4.5], window: 2.0, glare: 1.0, alertEvery: [6, 9], noticeRadius: 2.4, angryTime: 6, darkOnly: true,
    projectile: { shape: 'block', color: 0xff7ad9, colors: [0xd8312e, 0xffd21a, 0x1f9fe0, 0x6fd36a, 0xff7ad9], speed: 8, damage: 9, interval: 0.5, spread: 3, bounce: 2 },
    loot: { coin: 12, bill: 6, pearl: 3, gem: 1, heart: 1 },
    intro: 'PIXEL PIP is glued to his WIDR Boy!',
    tip: 'He shows off while you watch — his game only <b>crashes in the dark</b>. Switch your light <b>OFF</b>, wait for him to <b>blow into the cartridge</b>, then switch it back <b>ON</b>!',
    labels: {
      perform: '🎮 PLAYING — HE PLAYS BEST WHEN WATCHED...', tell: '💨 BLOWING ON THE CARTRIDGE — LIGHT ON!',
      alert: '👀 "ARE YOU WATCHING?" — FREEZE!', angry: '🧱 TANTRUM — DODGE THE BLOCKS', return: 'BACK TO HIS GAME',
      stunned: '💫 STUNNED — VACUUM!', tug: '🌀 TUG-OF-WAR!', captured: 'CAPTURED!',
    },
  },
};

const PROJECTILE_GEO = {
  note: new THREE.SphereGeometry(0.16, 8, 6),
  pillow: new THREE.BoxGeometry(0.6, 0.2, 0.42),
  ember: new THREE.IcosahedronGeometry(0.2, 0),
  paint: new THREE.SphereGeometry(0.2, 8, 6),
  floppy: new THREE.BoxGeometry(0.36, 0.04, 0.36),
  block: new THREE.BoxGeometry(0.32, 0.32, 0.32),
};

export class PortraitGhost extends Ghost {
  constructor(scene, { id, room, spot }) {
    const prof = BOSS_PROFILES[id];
    super(scene, { kind: prof.kind, room, spawn: spot.pos.clone(), hp: prof.hp, autoAppear: false, damage: prof.projectile.damage, value: prof.value, loot: prof.loot });
    this.isBoss = true;
    this.bossId = id;
    this.profile = prof;
    this.station = spot.pos.clone();
    this.roamCenter = spot.roam.clone();
    this.plates = [];
    this.plateTimer = 0;
    this.performTimer = this.randRange(prof.perform);
    this.alertTimer = this.randRange(prof.alertEvery);
    this.litTime = 0;
    this.introduced = false;
    this.summoned = false;
    this.chargeTimer = 2.5;
    this.charging = 0;
    this.chargeDir = new THREE.Vector3();
    this.faceAngle = 0;
    this.opacity = 1;
    this.applyOpacity(1);
    this.group.visible = true;
    this.setState('perform');
    this.projMat = new THREE.MeshStandardMaterial({ color: prof.projectile.color, emissive: prof.projectile.color, emissiveIntensity: prof.projectile.shape === 'ember' ? 1.6 : 0.4, roughness: 0.4, flatShading: true });
    // multi-coloured projectiles (Pip's toy blocks)
    this.projMats = (prof.projectile.colors || []).map((c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.35, roughness: 0.5, flatShading: true }));
    this.showoff = 0;
    this.showoffHinted = false;
  }

  build() {
    this.model = buildPortraitGhost(this.kind);
    this.group = this.model.group;
    this.name = this.model.name;
  }

  randRange([a, b]) {
    return a + Math.random() * (b - a);
  }

  get visible() {
    return this.state !== 'captured';
  }

  get hudState() {
    return this.state;
  }

  tryStun(player, game, surge = false, dt = 0) {
    const prof = this.profile;
    if (this.state === 'perform') {
      // light held on them (or a surge) breaks their concentration
      this.litTime += dt;
      if (surge || this.litTime > prof.glare) {
        this.litTime = 0;
        if (game.hud) game.hud.toast(surge ? 'Too early! Wait for the tell.' : `${prof.name.split(' ').pop()} noticed your light! Keep it off until the tell.`, 'danger');
        if (game.sound) game.sound.giggle();
        this.setState('alert');
      }
      return false;
    }
    if (this.state === 'fake') {
      // a failed build looks like the tell — but lighting him now backfires
      this.litTime += dt;
      if (surge || this.litTime > 0.25) {
        if (game.hud) game.hud.toast(`RED screen = failed build! ${prof.name} is FURIOUS!`, 'danger');
        this.becomeAngry(game);
      }
      return false;
    }
    if (this.state === 'tell') {
      this.stunTimer = CONFIG.flashlight.stunDuration * 1.1;
      this.chill = player.stats.chill;
      this.setState('stunned');
      this.model.heart.visible = true;
      this.model.setHeart(this.hp);
      if (game.sound) {
        game.sound.stun();
        game.sound.bossRoar();
      }
      if (game.fx) game.fx.stars(this.pos, 0xfff36b);
      if (game.hud) game.hud.toast(`${prof.name} is stunned! VACUUM NOW!`, 'info');
      if (this.bossId === 'snoozewell' && game.mansion) game.mansion.snoozeAwake = true;
      return true;
    }
    if (this.state === 'alert' && (surge || this.stateTime > 0.5)) {
      if (game.hud) game.hud.toast(`Caught in the light! ${prof.name} is ANGRY!`, 'danger');
      this.becomeAngry(game);
    }
    return false;
  }

  becomeAngry(game) {
    this.setState('angry');
    this.model.heart.visible = false;
    this.plateTimer = 0.7;
    this.chargeTimer = 2 + Math.random();
    this.charging = 0;
    if (this.bossId === 'snoozewell' && game.mansion) game.mansion.snoozeAwake = true;
    if (game.sound) game.sound.bossRoar();
    if (game.rig) game.rig.shake(0.45);
    // the Ghost Painter calls his apprentices once he's been hurt
    if (this.profile.summon && !this.summoned && this.hp < this.maxHp * 0.7 && game.spawnMinions) {
      this.summoned = true;
      game.spawnMinions(this, this.profile.summon);
    }
  }

  onLatchBroken(game, byDamage) {
    if (this.state !== 'tug') return;
    this.model.heart.visible = false;
    if (game.hud) game.hud.toast(`${this.profile.name} broke free — and is FURIOUS!`, 'danger');
    this.becomeAngry(game);
  }

  update(dt, game, t) {
    if (!this.alive) return;
    const player = game.player;
    const prof = this.profile;
    this.stateTime += dt;
    const dx = player.pos.x - this.pos.x;
    const dz = player.pos.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    const inRoom = game.currentRoomId === this.room;

    if (inRoom && !this.introduced) {
      this.introduced = true;
      if (game.onBossIntro) game.onBossIntro(this);
    }

    switch (this.state) {
      case 'perform': {
        this.pos.lerp(this.station, Math.min(1, dt * 3));
        this.litTime = Math.max(0, this.litTime - dt * 0.5);
        // Pip only crashes his game when nobody's watching (light off)
        if (!prof.darkOnly || !player.lightOn) this.performTimer -= dt;
        if (prof.darkOnly && inRoom && player.lightOn) {
          this.showoff += dt;
          if (this.showoff > 7 && !this.showoffHinted) {
            this.showoffHinted = true;
            if (game.hud) game.hud.toast('Pip is showing off while you watch... try switching your light OFF.', 'info');
          }
        }
        if (inRoom && Math.random() < dt * 0.6) this.activityFx(game, t);
        if (this.performTimer <= 0) {
          if (prof.fakeTell && Math.random() < prof.fakeTell) {
            this.setState('fake');
            this.litTime = 0;
            if (inRoom && game.sound && game.sound.buildFail) game.sound.buildFail();
            break;
          }
          this.setState('tell');
          if (inRoom && game.sound) {
            if (this.bossId === 'snoozewell' && game.sound.snore) game.sound.snore(true);
            else if (prof.activity === 'code' && game.sound.compile) game.sound.compile();
            else if (prof.activity === 'game' && game.sound.blow) game.sound.blow();
            else game.sound.warble(0.7);
          }
          break;
        }
        if (inRoom) {
          this.alertTimer -= dt;
          const runningClose = prof.wakeOnRun && player.speed01 > 0.75 && dist < 9;
          if (dist < prof.noticeRadius) {
            if (game.hud) game.hud.toast('Too close! You\'ve been spotted!', 'danger');
            this.becomeAngry(game);
          } else if (runningClose) {
            if (game.hud) game.hud.toast('Your footsteps woke him! Walk, don\'t run...', 'danger');
            this.setState('alert');
          } else if (this.alertTimer <= 0) {
            this.setState('alert');
          }
        }
        break;
      }
      case 'tell': {
        this.pos.lerp(this.station, Math.min(1, dt * 3));
        if (inRoom && this.bossId === 'snoozewell' && game.sound && game.sound.snore && Math.floor(this.stateTime * 1.2) !== Math.floor((this.stateTime - dt) * 1.2)) game.sound.snore(true);
        if (this.stateTime > prof.window) {
          this.setState('perform');
          this.performTimer = this.randRange(prof.perform);
        }
        break;
      }
      case 'fake': {
        // slams the desk over a failed build, then gets back to typing
        this.pos.lerp(this.station, Math.min(1, dt * 3));
        if (this.stateTime > prof.window) {
          this.setState('perform');
          this.performTimer = this.randRange(prof.perform);
        }
        break;
      }
      case 'alert': {
        this.pos.y = this.station.y + 0.25;
        if (player.speed01 > 0.35 && dist < 11 && this.stateTime > 0.35) {
          if (game.hud) game.hud.toast('You moved! Now you\'re in for it!', 'danger');
          this.becomeAngry(game);
        } else if (this.stateTime > 1.6) {
          this.setState('perform');
          this.alertTimer = this.randRange(prof.alertEvery);
          this.performTimer = Math.max(this.performTimer, 1.2);
          if (this.bossId === 'snoozewell' && game.mansion) game.mansion.snoozeAwake = false;
        }
        break;
      }
      case 'angry': {
        if (this.charging > 0) {
          // Boilerbeard's shoulder charge
          this.charging -= dt;
          this.pos.x += this.chargeDir.x * 11 * dt;
          this.pos.z += this.chargeDir.z * 11 * dt;
          this.pos.y = 1.4;
          if (game.fx && Math.random() < 0.6) game.fx.spark(this.pos.clone().setY(0.6), 0xff6a1a, 2);
        } else {
          const a = this.stateTime * 0.8;
          const c = this.roamCenter;
          const room = game.mansion.rooms[this.room];
          const rx = Math.min(7, (room.maxX - room.minX) / 2 - 2);
          const rz = Math.min(5, (room.maxZ - room.minZ) / 2 - 2);
          this.moveToward(this.tmp.set(c.x + Math.cos(a) * rx, 0, c.z + Math.sin(a) * rz), 3.6, dt);
          this.pos.y = 2.0 + Math.sin(t * 3) * 0.3;
          this.plateTimer -= dt;
          if (this.plateTimer <= 0 && inRoom) {
            this.plateTimer = prof.projectile.interval * (0.7 + Math.random() * 0.6);
            this.throwProjectile(game);
          }
          if (prof.charge && inRoom) {
            this.chargeTimer -= dt;
            if (this.chargeTimer <= 0) {
              this.chargeTimer = 3 + Math.random() * 2;
              this.charging = 0.6;
              this.chargeDir.set(dx, 0, dz).normalize();
              if (game.sound) game.sound.bossRoar();
              if (game.rig) game.rig.shake(0.3);
            }
          }
        }
        if (dist < 1.8 && player.invuln <= 0) player.takeDamage(prof.projectile.damage, this.pos, game);
        if (this.stateTime > prof.angryTime) {
          this.charging = 0;
          this.setState('return');
        }
        break;
      }
      case 'return': {
        this.moveToward(this.station, 4.2, dt);
        this.pos.y += (this.station.y - this.pos.y) * Math.min(1, dt * 2);
        if (Math.hypot(this.station.x - this.pos.x, this.station.z - this.pos.z) < 0.4) {
          this.setState('perform');
          this.performTimer = this.randRange(prof.perform);
          this.alertTimer = this.randRange(prof.alertEvery);
          if (this.bossId === 'snoozewell' && game.mansion) game.mansion.snoozeAwake = false;
          if (game.hud && inRoom) game.hud.toast(prof.labels.return.charAt(0) + prof.labels.return.slice(1).toLowerCase() + '... wait for the tell!', 'info');
        }
        break;
      }
      case 'stunned': {
        this.stunTimer -= dt;
        if (player.canLatch() && dist < CONFIG.vacuum.latchRange + 1) {
          const dot = (dx * -player.facingDir.x + dz * -player.facingDir.z) / Math.max(0.01, dist);
          if (dot > 0.5 || dist < 2.5) this.startTug(player, game);
        }
        if (this.state === 'stunned' && this.stunTimer <= 0) this.becomeAngry(game);
        break;
      }
      case 'tug':
        this.updateTug(dt, game, t, dist, dx, dz);
        break;
      case 'captured':
        this.updateCapture(dt, game);
        break;
      default:
        break;
    }

    const room = game.mansion.rooms[this.room];
    if (this.state !== 'captured') {
      this.pos.x = THREE.MathUtils.clamp(this.pos.x, room.minX + 1.0, room.maxX - 1.0);
      this.pos.z = THREE.MathUtils.clamp(this.pos.z, room.minZ + 1.0, room.maxZ - 1.0);
    }
    this.updateProjectiles(dt, game);
    this.animatePortrait(dt, t, dx, dz);
  }

  // little flourishes while they're busy
  activityFx(game, t) {
    if (!game.fx) return;
    const p = this.pos.clone();
    switch (this.profile.activity) {
      case 'piano':
        game.fx.sparkle(p.add(new THREE.Vector3(0, 0.4, 0.8)), 0xffd23a, 2);
        if (game.sound && game.sound.pianoNote) game.sound.pianoNote();
        break;
      case 'sleep':
        if (game.sound && game.sound.snore) game.sound.snore(false);
        break;
      case 'shovel':
        game.fx.spark(p.add(new THREE.Vector3(0, -0.6, -1.2)), 0xff6a1a, 4);
        if (game.sound) game.sound.thud();
        break;
      case 'paint':
        game.fx.sparkle(p.add(new THREE.Vector3(-1.2, 0, -0.4)), [0xd8312e, 0x3a7aff, 0xffd23a, 0x6fd36a][Math.floor(t * 3) % 4], 3);
        break;
      case 'code':
        game.fx.spark(p.add(new THREE.Vector3(0, -0.2, 0.9)), 0x3aff7a, 2);
        if (game.sound && game.sound.typing) game.sound.typing();
        break;
      case 'game':
        game.fx.sparkle(p.add(new THREE.Vector3(0, 0.1, 0.8)), [0x9aff6a, 0xffd21a, 0xff7ad9][Math.floor(t * 4) % 3], 2);
        if (game.sound && game.sound.chiptune) game.sound.chiptune();
        break;
      default:
        break;
    }
  }

  throwProjectile(game) {
    const prof = this.profile.projectile;
    const player = game.player;
    const m = new THREE.Mesh(PROJECTILE_GEO[prof.shape], this.projMats.length ? this.projMats[Math.floor(Math.random() * this.projMats.length)] : this.projMat);
    m.position.copy(this.pos);
    m.castShadow = prof.shape !== 'ember';
    this.scene.add(m);
    const lead = player.vel.clone().multiplyScalar(0.3);
    const dir = new THREE.Vector3(player.pos.x + lead.x - this.pos.x, 0, player.pos.z + lead.z - this.pos.z).normalize();
    const n = prof.spread > 3 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const mesh = i === 0 ? m : m.clone();
      if (i > 0) this.scene.add(mesh);
      const d = dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), (i - (n - 1) / 2) * 0.35);
      const vel = d.multiplyScalar(prof.speed);
      vel.y = -0.9;
      this.plates.push({ mesh, vel, life: 3 });
    }
    if (game.sound) game.sound.plateThrow();
  }

  updateProjectiles(dt, game) {
    const player = game.player;
    const prof = this.profile.projectile;
    for (let i = this.plates.length - 1; i >= 0; i--) {
      const p = this.plates[i];
      p.life -= dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.position.y = Math.max(0.9, p.mesh.position.y);
      p.mesh.rotation.y += dt * 10;
      p.mesh.rotation.x += dt * 6;
      const pp = p.mesh.position;
      if (prof.shape === 'ember' && game.fx && Math.random() < 0.3) game.fx.spark(pp, 0xff6a1a, 1);
      const hitPlayer = Math.hypot(pp.x - player.pos.x, pp.z - player.pos.z) < 0.7;
      const before = pp.clone();
      const hitWall = game.mansion.resolveCircle(pp, 0.25, true);
      if (hitWall && !hitPlayer && prof.bounce && (p.bounces || 0) < prof.bounce && p.life > 0) {
        // toy blocks ricochet off walls and furniture
        p.bounces = (p.bounces || 0) + 1;
        if (Math.abs(pp.x - before.x) > Math.abs(pp.z - before.z)) p.vel.x *= -1;
        else p.vel.z *= -1;
        if (game.sound) game.sound.thud();
        continue;
      }
      if (hitPlayer || hitWall || p.life <= 0) {
        if (hitPlayer) player.takeDamage(prof.damage, before, game);
        if (game.sound) (prof.shape === 'ember' ? game.sound.zap() : game.sound.plateCrash());
        if (game.fx) game.fx.puff(pp, prof.color, 8);
        this.scene.remove(p.mesh);
        this.plates.splice(i, 1);
      }
    }
  }

  animatePortrait(dt, t, dx, dz) {
    const m = this.model;
    const inner = m.inner;
    const act = this.profile.activity;
    const busy = this.state === 'perform' || this.state === 'tell' || this.state === 'alert' || this.state === 'fake';
    let target;
    if (busy || this.state === 'return') target = 0; // face the room (toward the camera)
    else if (this.state === 'tug') target = Math.atan2(this.fleeDir.x, this.fleeDir.z) + Math.PI;
    else target = Math.atan2(dx, dz);
    if (this.state !== 'captured') {
      this.faceAngle = lerpAngle(this.faceAngle, target, Math.min(1, dt * 4));
      this.group.rotation.y = this.faceAngle;
    }
    // defaults
    let rx = 0;
    let rz = Math.sin(t * 2.2 + this.bob) * 0.08;
    let armL = 0.3;
    let armR = 0.3;
    let armRz = 0.1;
    let eyeY = 1.3;
    let bobY = 0;
    if (this.state === 'perform') {
      if (act === 'piano') {
        armL = 0.15 + Math.max(0, Math.sin(t * 14)) * 0.18;
        armR = 0.15 + Math.max(0, Math.sin(t * 14 + 1.6)) * 0.18;
        rz = Math.sin(t * 1.8) * 0.15;
        rx = 0.15;
      } else if (act === 'sleep') {
        rz = 1.35;
        eyeY = 0.15;
        bobY = Math.sin(t * 1.4) * 0.04;
      } else if (act === 'shovel') {
        const s = Math.sin(t * 4.2);
        armR = 0.1 + s * 0.45;
        armRz = 0.5 + s * 0.3;
        rx = 0.25 + s * 0.15;
      } else if (act === 'paint') {
        armR = 0.45 + Math.sin(t * 9) * 0.12;
        armRz = 0.4 + Math.sin(t * 11) * 0.25;
        rz = -0.12 + Math.sin(t * 2) * 0.05;
      } else if (act === 'code') {
        // hunched over the keyboard, typing furiously
        armL = 0.05 + Math.max(0, Math.sin(t * 22)) * 0.1;
        armR = 0.05 + Math.max(0, Math.sin(t * 22 + 2.1)) * 0.1;
        rx = 0.3;
        rz = Math.sin(t * 1.3) * 0.05;
      } else if (act === 'game') {
        // button-mashing, leaning into every jump
        armL = 0.12 + Math.sin(t * 26) * 0.06;
        armR = 0.12 + Math.cos(t * 24) * 0.06;
        rx = 0.25;
        rz = Math.sin(t * 3.2) * 0.22;
      }
    } else if (this.state === 'fake') {
      // build failed: fists on the desk, eyes blazing
      armL = 0.0;
      armR = 0.0;
      rx = 0.4 + Math.sin(t * 30) * 0.04;
      eyeY = 1.8;
    } else if (this.state === 'tell') {
      if (act === 'piano') {
        rx = 0.7; // a deep, theatrical bow
        eyeY = 0.2;
      } else if (act === 'sleep') {
        rz = 1.35;
        eyeY = 0.1;
        bobY = Math.sin(t * 3) * 0.08;
        inner.scale.set(1 + Math.sin(t * 3) * 0.08, 1, 1 + Math.sin(t * 3) * 0.08);
      } else if (act === 'shovel') {
        armL = 0.85; // wiping his brow
        eyeY = 0.25;
        rx = -0.15;
      } else if (act === 'paint') {
        rx = -0.35; // leaning back to admire
        eyeY = 0.2;
        armR = 0.6;
      } else if (act === 'code') {
        rx = -0.4; // leaning back with a big stretch while it compiles
        armL = 0.95;
        armR = 0.95;
        eyeY = 0.2;
      } else if (act === 'game') {
        rx = -0.15; // eyes shut, cheeks puffed, blowing into the cartridge
        armL = 0.55;
        armR = 0.55;
        eyeY = 0.15;
        inner.scale.set(1.08 + Math.sin(t * 9) * 0.04, 0.95, 1.08);
      }
    } else if (this.state === 'alert') {
      eyeY = 1.8;
      rz = act === 'sleep' ? 0.9 : 0;
    } else if (this.state === 'angry') {
      armL = 0.6 + Math.sin(t * 12) * 0.3;
      armR = 0.6 + Math.cos(t * 12) * 0.3;
      eyeY = 1.6;
    }
    inner.rotation.x += (rx - inner.rotation.x) * Math.min(1, dt * 6);
    inner.rotation.z += (rz - inner.rotation.z) * Math.min(1, dt * 6);
    inner.position.y = bobY;
    if (!(this.state === 'tell' && (act === 'sleep' || act === 'game'))) {
      const breathe = 1 + Math.sin(t * 2.5 + this.bob) * 0.03;
      inner.scale.set(breathe, 1 / breathe, breathe);
    }
    if (m.arms) {
      m.arms[0].position.y += (armL - m.arms[0].position.y) * Math.min(1, dt * 10);
      m.arms[1].position.y += (armR - m.arms[1].position.y) * Math.min(1, dt * 10);
      m.arms[1].rotation.z += (armRz - m.arms[1].rotation.z) * Math.min(1, dt * 8);
    }
    if (m.tongue) m.tongue.visible = this.state === 'angry' || this.state === 'stunned';
    const heartOut = this.state === 'tell' || this.state === 'stunned' || this.state === 'tug';
    m.heart.visible = this.state === 'tell' || this.state === 'stunned';
    if (m.animate) m.animate(t, dt, heartOut);
    if (m.eyes) {
      const flare = this.state === 'angry' || this.state === 'alert' ? 5 : this.state === 'stunned' ? 0.6 : 2.4;
      m.eyes.forEach((e) => {
        e.material.emissiveIntensity = flare;
        e.scale.y += ((this.state === 'stunned' ? 0.3 + Math.abs(Math.sin(t * 5)) * 0.3 : eyeY) - e.scale.y) * Math.min(1, dt * 10);
      });
    }
    // device screens double as the tell: green = compiling, red = failed
    // build; Pip's handheld freezes to grey static when the game crashes
    if (m.screenMat) {
      let col = 0x3aff7a;
      let k = 1.3;
      const st = this.state;
      if (act === 'code') {
        if (st === 'perform') { col = 0x3aff7a; k = 1.0 + Math.random() * 0.5; }
        else if (st === 'tell') { col = 0x5affa0; k = 2.4 + Math.sin(t * 10) * 0.6; }
        else if (st === 'fake') { col = 0xff2a2a; k = Math.floor(t * 8) % 2 ? 2.8 : 0.6; }
        else if (st === 'alert') { col = 0xffd23a; k = 1.6; }
        else if (st === 'angry') { col = [0xff2a8a, 0x2affea, 0xffffff][Math.floor(t * 12) % 3]; k = 2.2; }
        else k = 0.2;
      } else {
        if (st === 'perform') { col = [0x9aff6a, 0xffd21a, 0x6ad8ff, 0xff7ad9][Math.floor(t * 3) % 4]; k = 1.4; }
        else if (st === 'tell') { col = 0x9a9aa8; k = 0.6 + Math.random() * 0.8; }
        else if (st === 'alert') { col = 0xffd23a; k = 1.6; }
        else if (st === 'angry') { col = 0xff2a2a; k = Math.floor(t * 6) % 2 ? 2 : 0.4; }
        else k = 0.2;
      }
      m.screenMat.emissive.setHex(col);
      m.screenMat.emissiveIntensity = k;
    }
    if (m.spinner) m.spinner.rotation.y += dt * (this.state === 'angry' ? 28 : this.state === 'perform' ? 9 : 3);
    const base = new THREE.Color(m.color);
    if (this.state === 'angry') m.bodyMat.emissive.setHex(0xc01a3a);
    else if (this.state === 'stunned' && this.chill > 0) m.bodyMat.emissive.setHex(0x9feaff);
    else m.bodyMat.emissive.copy(base);
    m.bodyMat.emissiveIntensity = this.state === 'tug' ? 1.0 + Math.sin(t * 25) * 0.3 : this.state === 'tell' ? 0.9 + Math.sin(t * 8) * 0.2 : 0.55;
    if (m.heart.visible) {
      const hb = 0.9 + Math.max(0, Math.sin(t * 9)) * 0.15;
      m.heart.scale.set(hb, hb, hb);
    }
  }

  dispose() {
    for (const p of this.plates) this.scene.remove(p.mesh);
    this.plates.length = 0;
  }
}

// ===================================================================
// BOO — hides inside furniture in rooms whose lights are already on.
// The Game Boy Horror beeps faster the closer you get to its hiding
// spot; search the furniture to flush it out. A Boo covers its face
// while you look at it and only PEEKS (heart showing) for a moment —
// or LAUGHS right after swooping at your back. One that breaks free
// flies off and hides again, sometimes in a neighbouring lit room.
// ===================================================================
const BOO_VULNERABLE = new Set(['peek', 'laugh']);

export class Boo extends Ghost {
  constructor(scene, { id, name, room, area = 1, value = 6000 }) {
    super(scene, {
      kind: 'white', room, spawn: new THREE.Vector3(0, -20, 0), hp: 70 + area * 15, damage: 8 + area * 2, value,
      autoAppear: false, loot: { coin: 6, bill: 4, pearl: 1, gem: 0.5 },
    });
    this.isBoo = true;
    this.bonus = true; // doesn't count toward clearing the room
    this.booId = id;
    this.name = name;
    this.state = 'dormant'; // until its room's lights come on
    this.hideSpot = null;
    this.rehideTarget = null;
    this.shyTime = 0;
    this.unlitTime = 0;
    this.peekAt = 1.6;
    this.awayTimer = 0;
    this.shyBlend = 0;
    this.eye = new THREE.Vector3();
  }

  build() {
    this.model = buildBoo();
    this.group = this.model.group;
    this.name = this.model.name;
  }

  // slip inside a piece of furniture (the Game Boy Horror starts beeping)
  hideIn(spot) {
    if (this.hideSpot && this.hideSpot.booHide === this) this.hideSpot.booHide = null;
    spot.booReserved = null;
    spot.booHide = this;
    spot.booProgress = 0;
    this.hideSpot = spot;
    this.rehideTarget = null;
    this.room = spot.room;
    this.setState('hiding');
    this.opacity = 0;
    this.applyOpacity(0);
    this.model.heart.visible = false;
    this.vel.set(0, 0, 0);
    this.pos.copy(spot.worldCenter());
  }

  // the furniture was searched: out it pops, cackling
  burstOut(game) {
    const spot = this.hideSpot;
    const c = spot.worldCenter();
    spot.booHide = null;
    spot.shake = Math.max(spot.shake, 0.6);
    this.hideSpot = null;
    this.pos.set(c.x, CONFIG.ghost.floatHeight + 0.3, c.z);
    this.setState('burst');
    this.group.visible = true;
    this.attackCooldown = 2.2;
    if (game.sound) game.sound.booLaugh();
    if (game.fx) game.fx.puff(this.pos, 0xeef2ff, 22);
    if (game.rig) game.rig.shake(0.25);
    if (game.onBooReleased) game.onBooReleased(this);
  }

  // fly off and hide again (maybe in the next lit room over)
  flee(game) {
    this.model.heart.visible = false;
    const spot = game.findBooSpot ? game.findBooSpot(this, this.hideSpot, true) : null;
    if (!spot) {
      this.setState('roam');
      this.attackCooldown = 1.5;
      return;
    }
    spot.booReserved = this;
    this.rehideTarget = spot;
    const moved = spot.room !== this.room;
    this.room = spot.room;
    this.setState('rehide');
    if (game.onBooFled) game.onBooFled(this, moved);
  }

  tryStun(player, game, surge = false) {
    if (this.state === 'stunned' || this.state === 'tug' || this.state === 'captured') return false;
    if (BOO_VULNERABLE.has(this.state) && this.opacity > 0.2) {
      this.stunTimer = CONFIG.flashlight.stunDuration * 0.8;
      this.chill = player.stats.chill;
      this.setState('stunned');
      this.model.heart.visible = true;
      this.model.setHeart(this.hp);
      if (game.sound) game.sound.stun();
      if (game.fx) game.fx.stars(this.pos, 0xfff36b);
      return true;
    }
    // a surge while it's hiding its face: it panics and flies off to hide
    if (surge && (this.state === 'shy' || this.state === 'roam')) {
      if (game.hud) game.hud.toast(`${this.name} got spooked and fled! Wait for it to PEEK.`, 'danger');
      this.flee(game);
    }
    return false;
  }

  currentPull(out) {
    // Boos are slippery: they tug harder than ordinary ghosts
    return super.currentPull(out).multiplyScalar(1.25);
  }

  onLatchBroken(game, byDamage, quiet = false) {
    if (this.state !== 'tug') return;
    if (game && game.sound && !quiet) game.sound.booLaugh();
    if (game && game.hud && !quiet) game.hud.toast(`${this.name} broke free and went to hide again!`, 'danger');
    this.flee(game);
  }

  update(dt, game, t) {
    if (!this.alive) return;
    if (this.state === 'stunned' || this.state === 'tug' || this.state === 'captured') {
      super.update(dt, game, t);
      return;
    }
    const player = game.player;
    const cfg = CONFIG.ghost;
    this.stateTime += dt;
    this.attackCooldown -= dt;
    const dx = player.pos.x - this.pos.x;
    const dz = player.pos.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    const sameRoom = game.currentRoomId === this.room;
    const room = game.mansion.rooms[this.room];

    if (this.state === 'dormant') return;
    if (this.state === 'hiding') {
      // rattles its hiding place and giggles when the hero comes close
      if (sameRoom && this.hideSpot) {
        const c = this.hideSpot.worldCenter();
        if (Math.hypot(c.x - player.pos.x, c.z - player.pos.z) < 4 && Math.random() < dt * 0.7) {
          this.hideSpot.shake = Math.max(this.hideSpot.shake, 0.3);
          if (game.sound) game.sound.giggle();
        }
      }
      return;
    }

    // is the hero's light on us right now?
    this.eye.copy(player.pos).setY(1.2);
    const lit = player.lightOn && !player.latched && dist < 9 && player.inFlashCone(this.pos) && game.mansion.lineOfSight(this.eye, this.pos);

    switch (this.state) {
      case 'burst': {
        this.opacity = Math.min(1, this.stateTime / 0.4);
        this.pos.y = cfg.floatHeight + 0.3 + Math.sin(this.stateTime * 8) * 0.15;
        if (this.stateTime > 1.0) this.setState('roam');
        break;
      }
      case 'roam': {
        this.opacity = Math.min(1, this.opacity + dt * 2);
        if (lit) {
          this.setState('shy');
          this.shyTime = 0;
          this.unlitTime = 0;
          this.peekAt = 1.3 + Math.random() * 0.9;
          break;
        }
        const look = dist > 0.01 ? (-dx * player.facingDir.x + -dz * player.facingDir.z) / dist : 1;
        if (look < -0.1) {
          // your back is turned: it creeps right up behind you
          this.wander.set(player.pos.x - player.facingDir.x * 1.2, 0, player.pos.z - player.facingDir.z * 1.2);
          this.moveToward(this.wander, 3.6, dt);
          this.attackCooldown -= dt * 0.8;
        } else {
          // circles at a cheeky distance
          const a = t * 0.7 + this.bob;
          this.wander.set(player.pos.x + Math.cos(a) * 4.5, 0, player.pos.z + Math.sin(a) * 4.5);
          this.moveToward(this.wander, 2.6, dt);
        }
        this.pos.y = cfg.floatHeight + 0.2 + Math.sin(t * 2 + this.bob) * 0.25;
        if (sameRoom && dist < 2.8 && this.attackCooldown <= 0) {
          this.setState('swoop');
          this.lungeDir.set(dx, 0, dz).normalize();
          if (game.sound) game.sound.shriek(1.5);
        }
        break;
      }
      case 'shy': {
        // hides its face and turns see-through, edging away from the light
        this.opacity += (0.35 - this.opacity) * Math.min(1, dt * 6);
        this.vel.multiplyScalar(Math.max(0, 1 - dt * 4));
        if (dist > 0.01) {
          this.pos.x -= (dx / dist) * 0.5 * dt;
          this.pos.z -= (dz / dist) * 0.5 * dt;
        }
        this.pos.y = cfg.floatHeight + 0.25 + Math.sin(t * 3) * 0.06;
        if (lit) {
          this.shyTime += dt;
          this.unlitTime = 0;
        } else {
          this.unlitTime += dt;
          if (this.unlitTime > 0.6) this.setState('roam');
        }
        if (this.state === 'shy' && this.shyTime > this.peekAt) {
          this.setState('peek');
          if (game.sound) game.sound.giggle();
        }
        break;
      }
      case 'peek': {
        // curiosity wins: it lowers its hands for a look — heart showing
        this.opacity += (0.9 - this.opacity) * Math.min(1, dt * 8);
        this.pos.y = cfg.floatHeight + 0.25 + Math.sin(t * 6) * 0.08;
        if (this.stateTime > 0.75) {
          this.setState(lit ? 'shy' : 'roam');
          this.shyTime = 0;
          this.peekAt = 1.1 + Math.random() * 1.0;
        }
        break;
      }
      case 'swoop': {
        this.opacity = 1;
        this.pos.x += this.lungeDir.x * 9 * dt;
        this.pos.z += this.lungeDir.z * 9 * dt;
        this.pos.y = cfg.floatHeight - 0.1;
        const hit = dist < cfg.attackRange + player.radius;
        if (hit && player.takeDamage(this.damage, this.pos, game) && game.fx) game.fx.puff(player.pos, 0xeef2ff, 12);
        if (hit || this.stateTime > 0.5) {
          this.setState('laugh');
          this.attackCooldown = 2.6;
          if (game.sound) game.sound.booLaugh();
        }
        break;
      }
      case 'laugh': {
        // cackling with its tongue out — wide open to the light
        this.pos.y = cfg.floatHeight + 0.2 + Math.sin(t * 7) * 0.12;
        if (this.stateTime > 1.0) this.setState('roam');
        break;
      }
      case 'rehide': {
        const spot = this.rehideTarget;
        if (!spot) {
          this.setState('roam');
          break;
        }
        const c = spot.worldCenter();
        this.moveToward(c, 7, dt);
        this.pos.y += (1.0 - this.pos.y) * Math.min(1, dt * 3);
        this.opacity = Math.max(0, 1 - this.stateTime / 1.6);
        if (Math.hypot(c.x - this.pos.x, c.z - this.pos.z) < 0.7 || this.stateTime > 2.6) this.hideIn(spot);
        break;
      }
      default:
        break;
    }

    // left alone, a Boo slips back into the furniture
    if (!sameRoom && this.state !== 'rehide' && this.state !== 'hiding') {
      this.awayTimer += dt;
      if (this.awayTimer > 2.5) {
        this.awayTimer = 0;
        const spot = game.findBooSpot ? game.findBooSpot(this, null, false) : null;
        if (spot) this.hideIn(spot);
      }
    } else {
      this.awayTimer = 0;
    }

    if (room && this.state !== 'rehide' && this.state !== 'hiding') {
      this.pos.x = THREE.MathUtils.clamp(this.pos.x, room.minX + 0.8, room.maxX - 0.8);
      this.pos.z = THREE.MathUtils.clamp(this.pos.z, room.minZ + 0.8, room.maxZ - 0.8);
    }
    if (this.state !== 'hiding') this.animate(dt, t, dist, dx, dz);
  }

  animate(dt, t, dist, dx, dz) {
    const m = this.model;
    const st = this.state;
    if (st !== 'captured') {
      let target = Math.atan2(dx, dz);
      if (st === 'tug' || st === 'rehide') target = Math.atan2(this.fleeDir.x, this.fleeDir.z) + Math.PI;
      this.faceAngle = lerpAngle(this.faceAngle, target, Math.min(1, dt * 6));
      this.group.rotation.y = this.faceAngle;
    }
    // hands over the face when shy, flapping at the sides otherwise
    this.shyBlend += ((st === 'shy' ? 1 : 0) - this.shyBlend) * Math.min(1, dt * 10);
    const s = this.shyBlend;
    const flap = Math.sin(t * 5 + this.bob) * 0.06 * (1 - s);
    m.arms[0].position.set(-0.6 + 0.38 * s, 0.35 + 0.28 * s + flap, 0.15 + 0.48 * s);
    m.arms[1].position.set(0.6 - 0.38 * s, 0.35 + 0.28 * s - flap, 0.15 + 0.48 * s);
    const open = st === 'peek' || st === 'laugh' || st === 'stunned' || st === 'burst' || st === 'swoop' || st === 'tug';
    m.tongue.visible = open;
    m.tongue.scale.y = 1.7 + (st === 'laugh' ? Math.sin(t * 14) * 0.4 : 0);
    m.mouth.scale.y = st === 'shy' ? 0.3 : 0.75;
    m.tail.rotation.y = Math.sin(t * 4 + this.bob) * 0.4;
    const inner = m.inner;
    inner.rotation.z = Math.sin(t * 2.2 + this.bob) * 0.15 + (st === 'laugh' ? Math.sin(t * 16) * 0.12 : 0);
    const breathe = 1 + Math.sin(t * 3 + this.bob) * 0.05;
    inner.scale.set(breathe, 1 / breathe, breathe);

    const heartOut = BOO_VULNERABLE.has(st) || st === 'stunned';
    m.heart.visible = heartOut;
    m.heart3d.visible = heartOut || st === 'tug';
    if (m.heart.visible) {
      const hb = 0.7 + Math.max(0, Math.sin(t * 9)) * 0.12;
      m.heart.scale.set(hb, hb, hb);
    }
    if (st === 'stunned') {
      inner.rotation.y += dt * 4;
      m.bodyMat.emissiveIntensity = 0.9 + Math.sin(t * 20) * 0.3;
    } else {
      inner.rotation.y *= 0.9;
      m.bodyMat.emissiveIntensity = st === 'tug' ? 1.0 + Math.sin(t * 25) * 0.3 : 0.45;
    }
    this.applyOpacity(this.opacity);
  }
}

// ===================================================================
// SPEEDY SPIRIT — a rare treasure ghost hiding in the furniture of a room
// that is still dark (watch for a blue glimmer). Search that piece, or walk
// right up to it, and it bolts, zig-zagging away. It never attacks, so ANY
// beam stuns it — if you can keep up. Left alone it dives into another piece
// of furniture, and once the room's lights come on it's gone for good.
// ===================================================================
export class SpeedySpirit extends Ghost {
  constructor(scene, { id, room, area = 1 }) {
    super(scene, {
      kind: 'speedy', room, spawn: new THREE.Vector3(0, -20, 0), hp: 50 + area * 10, value: 6000 + area * 1000,
      autoAppear: false, damage: 0, loot: { coin: 14, bill: 8, pearl: 3, gem: 1 },
    });
    this.bonus = true; // doesn't count toward clearing the room
    this.isSpeedy = true;
    this.speedyId = id;
    this.state = 'dormant';
    this.hideSpot = null;
    this.rehideTarget = null;
    this.glimmer = 1;
  }

  isVulnerable() {
    return this.state === 'flee';
  }

  hideIn(spot) {
    if (this.hideSpot && this.hideSpot.booHide === this) this.hideSpot.booHide = null;
    spot.booReserved = null;
    spot.booHide = this;
    spot.booProgress = 0;
    this.hideSpot = spot;
    this.rehideTarget = null;
    this.setState('hiding');
    this.opacity = 0;
    this.applyOpacity(0);
    this.model.heart.visible = false;
    this.vel.set(0, 0, 0);
    this.pos.copy(spot.worldCenter());
  }

  // flushed out of the furniture: off it zooms
  burstOut(game) {
    const spot = this.hideSpot;
    const c = spot.worldCenter();
    spot.booHide = null;
    spot.shake = Math.max(spot.shake, 0.6);
    this.hideSpot = null;
    this.pos.set(c.x, CONFIG.ghost.floatHeight, c.z);
    this.opacity = 0.6;
    this.setState('flee');
    this.group.visible = true;
    if (game.sound) {
      game.sound.giggle();
      game.sound.chime('pearl');
    }
    if (game.fx) game.fx.sparkle(this.pos, 0x9ad8ff, 22);
    if (game.onSpeedyReleased) game.onSpeedyReleased(this);
  }

  rehide(game) {
    // broke free after the lights came on: nowhere dark left to hide
    if (game.mansion.rooms[this.room] && game.mansion.rooms[this.room].lit) {
      this.vanishForever(game, true);
      return;
    }
    const spot = game.findSpeedySpot ? game.findSpeedySpot(this, this.hideSpot) : null;
    this.model.heart.visible = false;
    if (!spot) {
      this.setState('flee');
      return;
    }
    spot.booReserved = this;
    this.rehideTarget = spot;
    this.setState('rehide');
    if (game.sound) game.sound.giggle();
    if (game.hud && game.currentRoomId === this.room) game.hud.toast('💨 The Speedy Spirit dove back into the furniture!', 'info');
  }

  // the room's lights came on: it escapes the mansion for good
  vanishForever(game, announce) {
    if (this.hideSpot && this.hideSpot.booHide === this) this.hideSpot.booHide = null;
    if (this.rehideTarget) this.rehideTarget.booReserved = null;
    this.alive = false;
    this.scene.remove(this.group);
    if (announce && game.hud) game.hud.toast('💨 A Speedy Spirit fled the light — its treasure is gone!', 'danger');
    if (announce && game.fx) game.fx.sparkle(this.pos.clone().setY(1.2), 0x9ad8ff, 18);
  }

  tryStun(player, game, surge = false) {
    if (this.state !== 'flee' || this.opacity < 0.2) return false;
    this.stunTimer = CONFIG.flashlight.stunDuration * 0.6; // it shakes off a stun fast
    this.chill = player.stats.chill;
    this.setState('stunned');
    this.model.heart.visible = true;
    this.model.setHeart(this.hp);
    if (game.sound) game.sound.stun();
    if (game.fx) game.fx.stars(this.pos, 0x9ad8ff);
    return true;
  }

  onLatchBroken(game, byDamage, quiet = false) {
    if (this.state !== 'tug') return;
    if (game && game.hud && !quiet) game.hud.toast('The Speedy Spirit slipped away!', 'danger');
    this.rehide(game);
  }

  update(dt, game, t) {
    if (!this.alive) return;
    if (this.state === 'stunned' || this.state === 'tug' || this.state === 'captured') {
      super.update(dt, game, t);
      // a stun that wears off sends it running again, not roaming
      if (this.state === 'roam') this.setState('flee');
      return;
    }
    const player = game.player;
    this.stateTime += dt;
    const dx = player.pos.x - this.pos.x;
    const dz = player.pos.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    const sameRoom = game.currentRoomId === this.room;
    const room = game.mansion.rooms[this.room];
    if (this.state === 'dormant') return;

    if (this.state === 'hiding') {
      if (!sameRoom || !this.hideSpot) return;
      const c = this.hideSpot.worldCenter();
      // a blue glimmer gives its hiding place away
      this.glimmer -= dt;
      if (this.glimmer <= 0) {
        this.glimmer = 1.4 + Math.random() * 1.2;
        if (game.fx) game.fx.sparkle(c.clone().setY(c.y + 0.6), 0x9ad8ff, 5);
        if (game.sound) game.sound.chime('coin');
      }
      // skittish: walking right up to it scares it out
      if (Math.hypot(c.x - player.pos.x, c.z - player.pos.z) < 2.0) this.burstOut(game);
      return;
    }

    if (this.state === 'flee') {
      this.opacity = Math.min(1, this.opacity + dt * 2);
      // dash away from the hero, zig-zagging
      const away = dist > 0.01 ? 1 / dist : 0;
      const zig = Math.sin(t * 5 + this.bob) * 2.5;
      this.wander.set(
        this.pos.x - dx * away * 4 - dz * away * zig,
        0,
        this.pos.z - dz * away * 4 + dx * away * zig,
      );
      this.moveToward(this.wander, 6.4, dt);
      this.pos.y = CONFIG.ghost.floatHeight + Math.sin(t * 9) * 0.15;
      if (game.fx && Math.random() < dt * 14) game.fx.sparkle(this.pos, 0x9ad8ff, 1);
      if (this.stateTime > 9) this.rehide(game);
    } else if (this.state === 'rehide') {
      const spot = this.rehideTarget;
      const c = spot.worldCenter();
      this.moveToward(c, 9, dt);
      this.opacity = Math.max(0, 1 - this.stateTime / 1.2);
      if (Math.hypot(c.x - this.pos.x, c.z - this.pos.z) < 0.7 || this.stateTime > 2) this.hideIn(spot);
    }

    if (room && this.state !== 'rehide' && this.state !== 'hiding') {
      this.pos.x = THREE.MathUtils.clamp(this.pos.x, room.minX + 0.8, room.maxX - 0.8);
      this.pos.z = THREE.MathUtils.clamp(this.pos.z, room.minZ + 0.8, room.maxZ - 0.8);
    }
    if (this.state !== 'hiding') this.animate(dt, t, dist, dx, dz);
  }
}
