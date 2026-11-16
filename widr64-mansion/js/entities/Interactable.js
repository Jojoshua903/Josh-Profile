// ==========================================================
// Interactable.js — rattling furniture, billowing curtains,
// ornate treasure chests (revealed when a room is cleared),
// creaky doors, the trapped painting, and collectible
// physics (coins, bills, pearls, gems, hearts) that zip into
// the Poltergust nozzle.
// ==========================================================
import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { CONFIG } from '../config.js';

// ---------------------------------------------------------------
// Collectibles
const LOOT_DEFS = {
  coin: { value: () => CONFIG.loot.coin, color: 0xffd23a, emissive: 0x6a4a00, sound: 'coin' },
  bill: { value: () => CONFIG.loot.bill, color: 0x6fd36a, emissive: 0x0c3a0a, sound: 'bill' },
  pearl: { value: () => CONFIG.loot.pearl, color: 0xf6f2ff, emissive: 0x5a5a7a, sound: 'pearl' },
  gem: { value: () => CONFIG.loot.gem, color: 0x5fd8ff, emissive: 0x0a4a7a, sound: 'gem' },
  heart: { value: () => 0, heal: 20, color: 0xff3b6b, emissive: 0x7a0020, sound: 'pearl' },
};

const FLOOR_Y = { coin: 0.12, bill: 0.03, pearl: 0.18, gem: 0.18, heart: 0.3 };

export class LootSystem {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.geos = {
      coin: new THREE.CylinderGeometry(0.17, 0.17, 0.04, 10),
      bill: new THREE.BoxGeometry(0.42, 0.02, 0.22),
      pearl: new THREE.SphereGeometry(0.15, 10, 8),
      gem: new THREE.OctahedronGeometry(0.2, 0),
      heartLobe: new THREE.IcosahedronGeometry(0.11, 1),
      heartTip: new THREE.ConeGeometry(0.16, 0.22, 6),
    };
    this.mats = {};
    for (const [k, d] of Object.entries(LOOT_DEFS)) {
      this.mats[k] = new THREE.MeshStandardMaterial({
        color: d.color, emissive: d.emissive, emissiveIntensity: 1.2,
        metalness: k === 'coin' ? 0.85 : 0.2, roughness: k === 'pearl' ? 0.15 : 0.35, flatShading: true,
      });
    }
    this.nozzle = new THREE.Vector3();
  }

  makeMesh(type) {
    if (type === 'heart') {
      const g = new THREE.Group();
      const l = new THREE.Mesh(this.geos.heartLobe, this.mats.heart);
      l.position.set(-0.08, 0.05, 0);
      const r = new THREE.Mesh(this.geos.heartLobe, this.mats.heart);
      r.position.set(0.08, 0.05, 0);
      const tip = new THREE.Mesh(this.geos.heartTip, this.mats.heart);
      tip.rotation.z = Math.PI;
      tip.position.y = -0.1;
      g.add(l, r, tip);
      g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      return g;
    }
    const m = new THREE.Mesh(this.geos[type], this.mats[type]);
    m.castShadow = true;
    return m;
  }

  // table: { coin, bill, pearl, gem, heart } counts (fractions = chance).
  // luck (Fionn) multiplies counts and adds bonus bills / rare gems.
  spawn(origin, table, luck = 1, spread = 1) {
    const list = [];
    for (const [type, count] of Object.entries(table)) {
      const mult = type === 'heart' ? 1 : luck;
      const n = count * mult;
      let whole = Math.floor(n);
      if (Math.random() < n - whole) whole++;
      for (let i = 0; i < whole; i++) list.push(type);
    }
    if (luck > 1.2) {
      if (Math.random() < 0.35 * (luck - 1)) list.push('gem');
      if (Math.random() < 0.6) list.push('bill');
    }
    for (const type of list) this.spawnOne(type, origin, spread);
    return list.length;
  }

  spawnOne(type, origin, spread = 1) {
    const m = this.makeMesh(type);
    m.position.copy(origin);
    m.position.y = Math.max(origin.y, 0.8);
    this.scene.add(m);
    const a = Math.random() * Math.PI * 2;
    const sp = (2 + Math.random() * 3.2) * spread;
    this.items.push({
      type,
      mesh: m,
      vel: new THREE.Vector3(Math.cos(a) * sp, 5 + Math.random() * 4, Math.sin(a) * sp),
      spin: new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8),
      life: CONFIG.loot.lifetime,
      grounded: false,
      delay: 0.35,
      seed: Math.random() * 10,
    });
  }

  update(dt, game) {
    const player = game.player;
    const g = CONFIG.loot.gravity;
    if (player) player.nozzleWorld(this.nozzle);
    const nz = this.nozzle;
    const t = performance.now() * 0.001;

    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      const p = it.mesh.position;
      it.life -= dt;
      it.delay -= dt;

      // suction: zip into the nozzle; otherwise a small walk-over magnet
      let pulled = false;
      if (player && it.delay <= 0) {
        const vac = player.vacuumInfluence(p);
        const pdx = player.pos.x - p.x;
        const pdz = player.pos.z - p.z;
        const pdist = Math.hypot(pdx, pdz);
        if (vac > 0) {
          pulled = true;
          const dx = nz.x - p.x;
          const dy = nz.y - p.y;
          const dz = nz.z - p.z;
          const d = Math.hypot(dx, dy, dz) + 0.001;
          const accel = CONFIG.vacuum.lootPull * (1.2 + vac * 2.5);
          it.vel.x += (dx / d) * accel * dt * 3;
          it.vel.y += (dy / d) * accel * dt * 3;
          it.vel.z += (dz / d) * accel * dt * 3;
          // swirl around the suction axis for a vortex feel
          it.vel.x += -dz / d * 4 * dt * vac * 6;
          it.vel.z += dx / d * 4 * dt * vac * 6;
          it.vel.multiplyScalar(1 - Math.min(0.9, dt * 3.5));
          const s = Math.max(0.35, Math.min(1, d / 1.5));
          it.mesh.scale.setScalar(s);
          if (d < 0.5) {
            this.collect(i, game);
            continue;
          }
        } else {
          it.mesh.scale.setScalar(1);
          if (pdist < CONFIG.loot.magnetRadius * ((game.player && game.player.stats.magnet) || 1)) {
            pulled = true;
            it.vel.x += (pdx / (pdist + 0.001)) * 30 * dt;
            it.vel.z += (pdz / (pdist + 0.001)) * 30 * dt;
          }
          if (pdist < 0.6) {
            this.collect(i, game);
            continue;
          }
        }
      }

      if (!pulled || !it.grounded) it.vel.y -= g * dt * (pulled ? 0.15 : 1);
      p.addScaledVector(it.vel, dt);
      const floorY = FLOOR_Y[it.type];
      if (p.y < floorY) {
        p.y = floorY;
        if (Math.abs(it.vel.y) > 1.2) {
          it.vel.y = -it.vel.y * CONFIG.loot.bounce;
          if (it.type === 'coin' && game.sound && Math.random() < 0.3) game.sound.blip();
        } else {
          it.vel.y = 0;
          it.grounded = true;
        }
        it.vel.x *= 0.82;
        it.vel.z *= 0.82;
      }
      if (game.mansion) game.mansion.resolveCircle(p, 0.15, pulled);

      if (it.grounded && !pulled) {
        it.mesh.rotation.y += dt * 2.5;
        if (it.type === 'coin') it.mesh.rotation.x = Math.PI / 2 * 0.9;
        if (it.type === 'bill') it.mesh.rotation.z = Math.sin(t * 3 + it.seed) * 0.1;
        if (it.type === 'gem' || it.type === 'heart') p.y = floorY + 0.12 + Math.sin(t * 4 + it.seed) * 0.06;
        if (it.type === 'heart') it.mesh.scale.setScalar(1 + Math.max(0, Math.sin(t * 8)) * 0.12);
      } else {
        it.mesh.rotation.x += it.spin.x * dt;
        it.mesh.rotation.y += it.spin.y * dt;
        it.mesh.rotation.z += it.spin.z * dt;
      }
      if (it.life < 5) it.mesh.visible = Math.floor(it.life * 8) % 2 === 0;
      if (it.life <= 0) {
        this.scene.remove(it.mesh);
        this.items.splice(i, 1);
      }
    }
  }

  collect(index, game) {
    const it = this.items[index];
    const def = LOOT_DEFS[it.type];
    this.scene.remove(it.mesh);
    this.items.splice(index, 1);
    if (it.type === 'heart') {
      if (game.player) game.player.heal(def.heal);
      if (game.hud) game.hud.toast(`❤️ +${def.heal} HP`, 'info');
    } else {
      game.addCash(def.value(), it.type);
    }
    if (game.sound) game.sound.chime(def.sound);
    if (game.fx) game.fx.sparkle(it.mesh.position, def.color, 8);
  }

  clear() {
    for (const it of this.items) this.scene.remove(it.mesh);
    this.items.length = 0;
  }
}

// ---------------------------------------------------------------
// Base class for searchable objects: rattles, tilts toward the
// nozzle while being vacuumed, and drops its stash once.
class Searchable {
  constructor(object, { loot = { coin: 3 }, room, label = 'furniture', searchTime = CONFIG.vacuum.furnitureShakeTime } = {}) {
    this.object = object;
    this.loot = loot;
    this.room = room;
    this.label = label;
    this.searched = false;
    this.progress = 0;
    this.searchTime = searchTime;
    this.shake = 0;
    this.lean = new THREE.Vector2();
    this.leanTarget = new THREE.Vector2();
    this.basePos = object.position.clone();
    this.baseRot = object.rotation.clone();
    this.center = new THREE.Vector3();
  }

  worldCenter() {
    this.object.getWorldPosition(this.center);
    this.center.y = Math.max(this.center.y, 0.8);
    return this.center;
  }

  // amount: search progress to add; from: nozzle world position (optional)
  poke(amount, game, from = null) {
    this.shake = Math.max(this.shake, 0.35);
    if (from) {
      const c = this.worldCenter();
      const dx = from.x - c.x;
      const dz = from.z - c.z;
      const d = Math.hypot(dx, dz) || 1;
      this.leanTarget.set(dx / d, dz / d);
    }
    // a Boo hiding inside? searching or vacuuming flushes it out, even
    // if the furniture's treasure was already taken
    if (this.booHide) {
      this.booProgress = (this.booProgress || 0) + amount;
      if (this.booProgress >= this.searchTime) {
        this.booHide.burstOut(game);
        return true;
      }
    }
    if (this.searched) return false;
    this.progress += amount;
    if (this.progress >= this.searchTime) {
      this.searched = true;
      this.onSearched(game);
      return true;
    }
    return false;
  }

  onSearched(game) {
    const luck = game.player ? game.player.stats.luck : 1;
    const table = { ...this.loot };
    // furniture occasionally hides a heart (more likely when hurt)
    const hurt = game.player ? 1 - game.player.hp / game.player.maxHp : 0;
    if (table.heart === undefined) table.heart = 0.12 + hurt * 0.35;
    const n = game.loot.spawn(this.worldCenter().clone().add(new THREE.Vector3(0, 0.5, 0)), table, luck);
    if (game.sound) game.sound.rattle();
    if (n > 0 && luck > 1.2 && game.hud) game.hud.toast('🍀 Lucky find!', 'info');
  }

  update(dt) {
    const active = this.shake > 0;
    if (!active) this.leanTarget.set(0, 0);
    this.lean.lerp(this.leanTarget, Math.min(1, dt * (active ? 6 : 3)));
    this.shake = Math.max(0, this.shake - dt);
    const k = this.shake * 0.12;
    const tilt = 0.09;
    this.object.position.x = this.basePos.x + (Math.random() - 0.5) * k + this.lean.x * 0.06;
    this.object.position.z = this.basePos.z + (Math.random() - 0.5) * k + this.lean.y * 0.06;
    this.object.rotation.x = this.baseRot.x + this.lean.y * tilt;
    this.object.rotation.z = this.baseRot.z - this.lean.x * tilt + (Math.random() - 0.5) * k * 0.6;
  }
}

export class Furniture extends Searchable {
  constructor(object, opts = {}) {
    super(object, { label: 'search', ...opts });
    this.kind = 'furniture';
  }
}

// ---------------------------------------------------------------
// Billowing curtains: vertices stretch toward the vacuum nozzle
export class Curtain extends Searchable {
  constructor(object, clothMesh, opts = {}) {
    super(object, { label: 'curtain', loot: { coin: 2, bill: 1 }, searchTime: 1.1, ...opts });
    this.kind = 'curtain';
    this.cloth = clothMesh;
    this.base = clothMesh.geometry.attributes.position.array.slice();
    this.billow = 0;
    this.phase = Math.random() * 10;
    this.normal = opts.normal || new THREE.Vector3(0, 0, 1);
    this.pullLocal = new THREE.Vector3();
    this.pullAmt = 0;
  }

  poke(amount, game, from = null) {
    this.billow = Math.min(1.6, this.billow + amount * 4);
    if (from) {
      this.pullLocal.copy(from);
      this.cloth.worldToLocal(this.pullLocal);
      this.pullAmt = 1;
    }
    return super.poke(amount, game, null);
  }

  update(dt, t) {
    this.billow = Math.max(0.15, this.billow - dt * 0.8);
    this.pullAmt = Math.max(0, this.pullAmt - dt * 2);
    const arr = this.cloth.geometry.attributes.position.array;
    const b = this.base;
    const reach = Math.min(1, this.billow);
    for (let i = 0; i < arr.length; i += 3) {
      const x = b[i];
      const y = b[i + 1];
      const hang = Math.max(0, 1 - (y + 1.6) / 3.2); // bottom of the curtain moves most
      const wave = Math.sin(t * 2.2 + x * 3 + this.phase) * 0.5 + Math.sin(t * 3.7 + y * 2 + this.phase) * 0.3;
      let px = b[i];
      let py = b[i + 1];
      let pz = b[i + 2] + (wave * 0.12 + this.billow * 0.55) * hang * (0.6 + 0.4 * Math.sin(x * 6));
      if (this.pullAmt > 0) {
        // stretch toward the nozzle, strongest at the hem
        const k = hang * hang * reach * this.pullAmt * 0.35;
        px += (this.pullLocal.x - px) * k * 0.4;
        py += (this.pullLocal.y - py) * k * 0.25;
        pz += Math.max(0, this.pullLocal.z - pz) * k * 0.5;
      }
      arr[i] = px;
      arr[i + 1] = py;
      arr[i + 2] = pz;
    }
    this.cloth.geometry.attributes.position.needsUpdate = true;
    this.cloth.geometry.computeVertexNormals();
  }
}

// ---------------------------------------------------------------
// Ornate treasure chest. Hidden until its room is cleared, then
// appears with a dramatic poof; pops open when approached.
export class Chest extends Searchable {
  constructor(object, lid, opts = {}) {
    super(object, { label: 'open chest', loot: { coin: 6, bill: 3, pearl: 1 }, searchTime: 0.01, ...opts });
    this.kind = 'chest';
    this.lid = lid;
    this.lidAngle = 0;
    this.glow = opts.glow || null;
    this.collider = opts.collider || null;
    this.hidden = !!opts.hidden;
    this.popT = this.hidden ? 0 : 1;
    this.autoOpenRange = 1.5;
    if (this.hidden) {
      object.visible = false;
      if (this.collider) this.collider.enabled = false;
    }
  }

  get available() {
    return !this.hidden;
  }

  reveal(game) {
    if (!this.hidden) return;
    this.hidden = false;
    this.popT = 0;
    this.object.visible = true;
    if (this.collider) this.collider.enabled = true;
    const c = this.worldCenter().clone();
    if (game.fx) {
      game.fx.puff(c, 0xffffff, 26);
      game.fx.sparkle(c, 0xffd23a, 18);
      game.fx.ring(c, 0xffd23a, 2.5);
    }
    if (game.sound) {
      game.sound.explosionPop();
      game.sound.chime('pearl');
    }
  }

  poke(amount, game, from) {
    if (this.hidden) return false;
    return super.poke(amount, game, null);
  }

  // called by the game loop with the hero's distance
  approach(dist, game) {
    if (!this.hidden && !this.searched && this.popT >= 1 && dist < this.autoOpenRange) this.poke(1, game);
  }

  onSearched(game) {
    if (game.sound) game.sound.chestOpen();
    const origin = this.worldCenter().clone().add(new THREE.Vector3(0, 0.6, 0));
    const luck = game.player ? game.player.stats.luck : 1;
    setTimeout(() => {
      if (game.loot) game.loot.spawn(origin, this.loot, luck, 0.8);
      if (game.fx) game.fx.sparkle(origin, 0xffd23a, 20);
    }, 450);
    // a room's key rises out of its chest
    if (this.keyItem && game.spawnKey) {
      const item = this.keyItem;
      this.keyItem = null;
      setTimeout(() => game.spawnKey(origin, item), 700);
      if (game.hud) game.hud.toast('🗝️ There\'s a key inside!', 'info');
      return;
    }
    if (game.hud) game.hud.toast('Treasure chest opened!', 'info');
  }

  update(dt) {
    if (this.hidden) return;
    if (this.popT < 1) {
      // elastic pop-in after the poof
      this.popT = Math.min(1, this.popT + dt * 2.2);
      const p = this.popT;
      const s = 1 + Math.sin(p * Math.PI * 2.5) * (1 - p) * 0.5;
      this.object.scale.setScalar(Math.max(0.01, p < 0.15 ? p / 0.15 : s));
      this.object.position.y = this.basePos.y + Math.sin(p * Math.PI) * 0.6;
    } else {
      this.object.scale.setScalar(1);
      this.object.position.y = this.basePos.y;
    }
    super.update(dt);
    if (this.searched && this.lidAngle < 1.9) {
      this.lidAngle = Math.min(1.9, this.lidAngle + dt * 3);
      // overshoot bounce as the lid flies open
      this.lid.rotation.x = -this.lidAngle - Math.sin(this.lidAngle * 1.6) * 0.15;
    }
    if (this.glow) {
      this.glow.material.opacity = this.searched ? Math.max(0, this.glow.material.opacity - dt) : 0.5 + Math.sin(performance.now() * 0.004) * 0.2;
    }
  }
}

// ---------------------------------------------------------------
// Creaky wooden door with hinge animation
export class Door {
  /*
    hinge: Group positioned at hinge point; door leaf is child.
    collider: AABB object {minX,maxX,minZ,maxZ,enabled}
    center: world position of door opening center
  */
  constructor({ hinge, collider, center, axis = 'x', openDir = 1, rooms = [], locked = false, name = 'door', lockMesh = null }) {
    this.hinge = hinge;
    this.collider = collider;
    this.center = center;
    this.axis = axis;
    this.openDir = openDir;
    this.rooms = rooms;
    this.locked = locked;
    this.name = name;
    this.lockMesh = lockMesh;
    this.angle = 0;
    this.target = 0;
    this.isOpen = false;
    this.rattle = 0;
    this.lockedCooldown = 0;
    this.baseRot = hinge.rotation.y;
    this.justOpened = false;
    this.vel = 0;
  }

  unlock() {
    this.locked = false;
    if (this.lockMesh) this.lockMesh.visible = false;
  }

  update(dt, game) {
    const p = game.player ? game.player.pos : null;
    this.lockedCooldown -= dt;
    this.justOpened = false;
    if (p) {
      const d = Math.hypot(p.x - this.center.x, p.z - this.center.z);
      if (d < CONFIG.world.doorOpenDist) {
        if (this.locked) {
          // carrying this door's key? it turns in the lock and the door swings open
          if (game.useKey && game.useKey(this)) return;
          if (this.lockedCooldown <= 0) {
            this.lockedCooldown = 1.6;
            this.rattle = 0.4;
            if (game.sound) game.sound.locked();
            if (game.hud) game.hud.toast(this.lockHint || 'The door is locked tight...', 'danger');
          }
        } else if (!this.isOpen) {
          this.isOpen = true;
          this.target = 1.65 * this.openDir;
          this.justOpened = true;
          if (game.sound) game.sound.creak();
          if (game.onDoorOpened) game.onDoorOpened(this);
        }
      }
    }
    // damped spring: slow creaky swing with a slight overshoot
    const k = CONFIG.world.doorSwingSpeed * 6;
    this.vel += (this.target - this.angle) * k * dt;
    this.vel *= Math.max(0, 1 - dt * 4.5);
    this.angle += this.vel * dt;
    let wobble = 0;
    if (this.rattle > 0) {
      this.rattle -= dt;
      wobble = Math.sin(this.rattle * 70) * 0.05;
    }
    this.hinge.rotation.y = this.baseRot + this.angle + wobble;
    this.collider.enabled = Math.abs(this.angle) < 0.6;
  }
}

// ---------------------------------------------------------------
// Trapped painting (end-of-run rescue)
export class TrappedPainting {
  constructor(group, char, onFree) {
    this.group = group;
    this.char = char;
    this.onFree = onFree;
    this.progress = 0;
    this.freed = false;
    this.active = false;
    this.shake = 0;
    this.basePos = group.position.clone();
  }

  poke(amount, game) {
    if (!this.active || this.freed) return false;
    this.progress += amount;
    this.shake = 0.3;
    if (game.fx && Math.random() < 0.3) game.fx.spark(this.worldCenter(), 0xb07dff, 2);
    if (this.progress > 2.2) {
      this.freed = true;
      this.onFree(game);
      return true;
    }
    return false;
  }

  worldCenter() {
    const v = new THREE.Vector3();
    this.group.getWorldPosition(v);
    return v;
  }

  update(dt, t) {
    if (!this.active) return;
    const bob = this.freed ? 0 : Math.sin(t * 2) * 0.05;
    let sx = 0;
    if (this.shake > 0) {
      this.shake -= dt;
      sx = (Math.random() - 0.5) * 0.12;
    }
    this.group.position.set(this.basePos.x + sx, this.basePos.y + bob, this.basePos.z);
  }
}
