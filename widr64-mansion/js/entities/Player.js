// ==========================================================
// Player.js — hero movement (mouse aim + WASD, or arcade tank
// controls), the real-time flashlight cone, Poltergust suction
// stream, tug-of-war handling, damage, and hero passives.
// ==========================================================
import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { CONFIG } from '../config.js';
import { buildHero, buildCat } from '../graphics/models.js';
import { makeBeamMaterial, makeLensFlare, makeVortex, softDot } from '../graphics/shaderlib.js';

const UP = new THREE.Vector3(0, 1, 0);

export class Player {
  constructor(scene, char, mansion, sound, stats = null) {
    this.scene = scene;
    this.char = char;
    // a copy, so workshop upgrades and hero perks never touch the roster data
    this.stats = stats || { ...char.stats };
    this.mansion = mansion;
    this.sound = sound;

    const hero = buildHero(char);
    this.model = hero.group;
    this.model.rotation.order = 'YXZ';
    this.parts = hero.parts;
    this.animateModel = hero.animate;
    scene.add(this.model);

    // level 10 mastery: a golden vacuum pack and nozzle
    if (this.stats.golden) {
      const gold = new THREE.MeshStandardMaterial({ color: 0xffc83a, metalness: 0.95, roughness: 0.22, emissive: 0x3a2400 });
      const gild = (o) => o && o.traverse((m) => {
        if (m.isMesh && !(m.material && m.material.emissiveIntensity > 1)) m.material = gold;
      });
      gild(this.parts.pack);
      if (this.parts.nozzleTip) gild(this.parts.nozzleTip.parent);
    }

    this.pos = this.model.position;
    this.vel = new THREE.Vector3();
    this.knock = new THREE.Vector3();
    this.facing = Math.PI; // facing -z (into the house)
    this.facingDir = new THREE.Vector3(0, 0, -1);
    this.maxHp = this.stats.maxHp;
    this.hp = this.maxHp;
    this.radius = CONFIG.player.radius * Math.max(0.8, this.stats.scale);
    this.speed01 = 0;

    this.flashCharge = 1;
    this.flashBurst = 0;
    this.lightOn = true;
    this.vacuumActive = false;
    this.vacuumPower = 0;
    this.latched = null;
    this.extraLatched = []; // other stunned ghosts caught in the same pull
    this.tugSession = null; // { caught, peak } for multi-catch bonuses
    this.game = null;
    this.latchCooldown = 0;
    this.pullStreak = 0;
    this.invuln = 0;
    this.footTimer = 0;
    this.damageTaken = 0;
    this.usingTank = false;
    this.dead = false;
    this.tugInput = new THREE.Vector3();

    // --- aim rig (unscaled, rotates with facing) -------------------
    this.aimRig = new THREE.Group();
    scene.add(this.aimRig);

    const fl = CONFIG.flashlight;
    const angle = fl.baseAngle * this.stats.beamWidth;
    this.beamAngle = angle;
    this.spot = new THREE.SpotLight(char.colors.light, fl.beamIntensity, fl.range * 1.4, angle, fl.penumbra, 1.2);
    this.spot.position.set(-0.25, 1.2, 0.45);
    this.spot.castShadow = true;
    this.spot.shadow.mapSize.set(CONFIG.render.shadowMapSize, CONFIG.render.shadowMapSize);
    this.spot.shadow.camera.near = 0.3;
    this.spot.shadow.camera.far = fl.range * 1.4;
    this.spot.shadow.bias = -0.0006;
    this.spot.shadow.normalBias = 0.02;
    this.spot.shadow.radius = 3;
    // the light lives on its own sub-rig so it can be aimed more smoothly than the body
    this.lightRig = new THREE.Group();
    this.aimRig.add(this.lightRig);
    this.lightYaw = Math.PI;
    this.lightRig.add(this.spot);
    this.spotTarget = new THREE.Object3D();
    this.spotTarget.position.set(-0.1, 0.15, 8);
    this.lightRig.add(this.spotTarget);
    this.spot.target = this.spotTarget;

    // volumetric beam: drifting fog and dust glints inside the cone
    const coneLen = fl.range * 0.95;
    const coneRad = Math.tan(angle) * coneLen;
    const coneGeo = new THREE.ConeGeometry(coneRad, coneLen, 36, 8, true);
    coneGeo.translate(0, -coneLen / 2, 0);
    coneGeo.rotateX(-Math.PI / 2);
    this.coneMat = makeBeamMaterial(char.colors.light, coneLen);
    this.cone = new THREE.Mesh(coneGeo, this.coneMat);
    this.cone.position.copy(this.spot.position);
    this.cone.rotation.x = Math.atan2(this.spot.position.y - this.spotTarget.position.y, this.spotTarget.position.z - this.spot.position.z);
    this.cone.renderOrder = 5;
    this.lightRig.add(this.cone);
    // lens flare at the flashlight
    this.flare = makeLensFlare(char.colors.light);
    this.flare.position.copy(this.spot.position).add(new THREE.Vector3(0, 0, 0.08));
    this.lightRig.add(this.flare);

    // small fill light so the hero is readable in the dark
    this.fill = new THREE.PointLight(0x8090ff, 1.4, 4, 2);
    this.fill.position.set(0, 2.2, -0.6);
    this.aimRig.add(this.fill);

    // Lars's headlamp (bonus ambient light)
    if (this.stats.headlamp > 0) {
      this.headlamp = new THREE.PointLight(0xffe0a0, this.stats.headlamp, 6.5, 1.5);
      this.headlamp.position.set(0, 2.1, 0.5);
      this.aimRig.add(this.headlamp);
    }

    // --- suction stream particles ---------------------------------
    const N = 110;
    this.streamN = N;
    const sGeo = new THREE.BufferGeometry();
    this.streamPos = new Float32Array(N * 3);
    this.streamSeed = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      this.streamSeed[i * 3] = Math.random();
      this.streamSeed[i * 3 + 1] = Math.random() * Math.PI * 2;
      this.streamSeed[i * 3 + 2] = 0.4 + Math.random() * 0.6;
    }
    sGeo.setAttribute('position', new THREE.BufferAttribute(this.streamPos, 3));
    this.streamMat = new THREE.PointsMaterial({
      color: char.colors.stream, size: 0.16, map: softDot(), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.stream = new THREE.Points(sGeo, this.streamMat);
    this.stream.frustumCulled = false;
    this.aimRig.add(this.stream);
    this.nozzleLocal = new THREE.Vector3(0.38, 1.05, 0.75);
    // swirling vortex in front of the nozzle while sucking
    this.vortex = makeVortex(char.colors.stream);
    this.vortex.position.copy(this.nozzleLocal);
    this.aimRig.add(this.vortex);

    // tether lines for tug-of-war: one for the lead ghost, plus one for each
    // extra ghost dragged into the same pull (up to CONFIG.vacuum.maxGroup)
    this.tethers = [];
    for (let k = 0; k < CONFIG.vacuum.maxGroup; k++) {
      const tGeo = new THREE.BufferGeometry();
      tGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(24 * 3), 3));
      const line = new THREE.Line(tGeo, new THREE.LineBasicMaterial({ color: char.colors.stream, transparent: true, opacity: k ? 0.6 : 0.85, blending: THREE.AdditiveBlending }));
      line.frustumCulled = false;
      line.visible = false;
      scene.add(line);
      this.tethers.push(line);
    }
    this.tether = this.tethers[0];

    // --- Kayo & Yara follow Lars around --------------------------
    this.cats = [];
    if (char.id === 'lars') {
      const kayo = buildCat(0x222222, 0xf7d14a, 0xf6f6f6);
      const yara = buildCat(0xe8913a, 0x5fdc6f);
      [kayo, yara].forEach((c, i) => {
        scene.add(c.group);
        c.group.position.set(i ? 0.9 : -0.9, 0, 1.2);
        this.cats.push({ ...c, offset: new THREE.Vector3(i ? 1.0 : -1.0, 0, -1.1), vel: new THREE.Vector3() });
      });
    }

    this.tmp = new THREE.Vector3();
    this.tmp2 = new THREE.Vector3();
  }

  spawn(pos, facing = Math.PI) {
    this.pos.copy(pos);
    this.facing = facing;
    this.lightYaw = facing;
    this.vel.set(0, 0, 0);
    this.cats.forEach((c, i) => c.group.position.set(pos.x + (i ? 1 : -1), 0, pos.z + 1.2));
    this.syncRig();
  }

  syncRig() {
    this.facingDir.set(Math.sin(this.facing), 0, Math.cos(this.facing));
    this.model.rotation.y = this.facing;
    this.aimRig.position.copy(this.pos);
    this.aimRig.rotation.y = this.facing;
    this.lightRig.rotation.y = this.lightYaw - this.facing;
  }

  nozzleWorld(out = new THREE.Vector3()) {
    return out.copy(this.nozzleLocal).applyAxisAngle(UP, this.facing).add(this.pos);
  }

  // 0..1 suction strength felt at a world point
  vacuumInfluence(point) {
    if (!this.vacuumActive || this.latched) return 0;
    const dx = point.x - this.pos.x;
    const dz = point.z - this.pos.z;
    const d = Math.hypot(dx, dz);
    const range = CONFIG.vacuum.range;
    if (d > range || d < 0.01) return d < 0.01 ? this.vacuumPower : 0;
    const dot = (dx * this.facingDir.x + dz * this.facingDir.z) / d;
    if (dot < CONFIG.vacuum.coneDot) return 0;
    return (1 - d / range) * this.vacuumPower * (0.5 + 0.5 * dot);
  }

  // is a world point inside the flashlight's stun cone?
  inFlashCone(point, rangeMult = 1) {
    const dx = point.x - this.pos.x;
    const dz = point.z - this.pos.z;
    const d = Math.hypot(dx, dz);
    if (d > CONFIG.flashlight.stunRange * rangeMult) return false;
    if (d < 0.8) return true;
    const dot = (dx * this.facingDir.x + dz * this.facingDir.z) / d;
    const baseAngle = Math.acos(CONFIG.flashlight.stunConeDot);
    return dot > Math.cos(baseAngle * this.stats.beamWidth);
  }

  latch(ghost) {
    // a fresh pull starts a new multi-catch session
    if (!this.latched) this.tugSession = { caught: 0, peak: 1 };
    this.latched = ghost;
    this.extraLatched.length = 0;
    this.pullStreak = 0;
  }

  // another stunned ghost drifting into the suction joins the current pull
  canJoinTug() {
    return this.vacuumActive && !!this.latched && !this.latched.isBoss && this.vacuumPower > 0.25 &&
      1 + this.extraLatched.length < CONFIG.vacuum.maxGroup;
  }

  joinTug(ghost) {
    this.extraLatched.push(ghost);
    if (this.tugSession) this.tugSession.peak = Math.max(this.tugSession.peak, 1 + this.extraLatched.length);
  }

  // all ghosts currently held by the vacuum, lead first
  heldGhosts() {
    return this.latched ? [this.latched, ...this.extraLatched] : [];
  }

  // a held ghost was sucked in (or slipped away on its own): drop it from the
  // pull. If it was the lead, the next ghost takes over so the tug continues.
  detach(ghost, cooldown = false) {
    const i = this.extraLatched.indexOf(ghost);
    if (i >= 0) {
      this.extraLatched.splice(i, 1);
      return;
    }
    if (ghost !== this.latched) return;
    if (this.extraLatched.length) {
      this.latched = this.extraLatched.shift();
    } else {
      this.release(cooldown);
    }
  }

  // ends the whole pull; any extra ghosts still held break free with the lead
  release(cooldown = true) {
    const extras = this.extraLatched.splice(0);
    for (const g of extras) g.onLatchBroken(this.game, false, true);
    this.latched = null;
    if (cooldown) this.latchCooldown = CONFIG.vacuum.latchCooldown * this.stats.latchRecovery;
  }

  canLatch() {
    return this.vacuumActive && !this.latched && this.latchCooldown <= 0 && this.vacuumPower > 0.25;
  }

  heal(amount) {
    if (this.dead) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  takeDamage(amount, fromPos, game) {
    if (this.invuln > 0 || this.dead) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.damageTaken += amount;
    if (game && game.onPlayerHit) game.onPlayerHit(); // boss fights track hits for portrait frames
    this.invuln = CONFIG.player.invulnTime;
    const dir = this.tmp.set(this.pos.x - fromPos.x, 0, this.pos.z - fromPos.z);
    if (dir.lengthSq() < 0.001) dir.set(0, 0, 1);
    dir.normalize();
    this.knock.copy(dir).multiplyScalar(CONFIG.player.knockback * this.stats.dodge);
    if (this.latched) {
      this.latched.onLatchBroken(game, true);
      this.release();
    }
    if (this.sound) this.sound.hurt();
    if (game) {
      game.rig.shake(0.55);
      game.hud.hurtFlash();
      if (this.hp <= 0) game.onPlayerDown();
    }
    return true;
  }

  // ---------------------------------------------------------------
  update(dt, input, game, t) {
    const cfg = CONFIG.player;
    const st = this.stats;
    this.game = game;
    this.invuln = Math.max(0, this.invuln - dt);
    this.latchCooldown = Math.max(0, this.latchCooldown - dt);

    // --- input → movement
    const lateral = !!(game && game.options && game.options.control === 'lateral');
    let mx = 0;
    let mz = 0;
    if (input.tankForward !== 0 || input.tankTurn !== 0) this.usingTank = true;
    if (input.moveX !== 0 || input.moveZ !== 0 || input.mouseMoved || input.stickAim) this.usingTank = false;

    if (this.usingTank && !this.latched) {
      this.facing -= input.tankTurn * cfg.tankTurnSpeed * dt;
      mx = Math.sin(this.facing) * input.tankForward;
      mz = Math.cos(this.facing) * input.tankForward;
    } else if (this.usingTank && this.latched) {
      // arcade mode during tug: up/down = pull back/forward relative to ghost, left/right strafe
      const fx = Math.sin(this.facing);
      const fz = Math.cos(this.facing);
      mx = fx * input.tankForward + fz * input.tankTurn;
      mz = fz * input.tankForward - fx * input.tankTurn;
    } else {
      mx = input.moveX;
      mz = input.moveZ;
      if (lateral && !this.latched) {
        // Lateral walking: W/S step forward/back along the facing, A/D sidestep;
        // the hero keeps facing where the light points (mouse / arrows turn)
        const fx = Math.sin(this.facing);
        const fz = Math.cos(this.facing);
        const fwd = -input.moveZ;
        const side = input.moveX;
        mx = fx * fwd - fz * side;
        mz = fz * fwd + fx * side;
      }
    }
    const mLen = Math.hypot(mx, mz);
    if (mLen > 1) {
      mx /= mLen;
      mz /= mLen;
    }

    // --- facing
    if (this.latched) {
      // the ghost thrashes about: turn toward it steadily rather than snapping
      const g = this.latched.pos;
      const target = Math.atan2(g.x - this.pos.x, g.z - this.pos.z);
      this.facing = lerpAngle(this.facing, target, Math.min(1, dt * 6));
    } else if (!this.usingTank) {
      if (input.stickAim) {
        // twin-stick: right stick points the light, left stick walks freely
        const target = Math.atan2(input.stickAim.x, input.stickAim.z);
        this.facing = lerpAngle(this.facing, target, Math.min(1, dt * 14));
      } else if (input.mouseAim && input.aimPoint) {
        const target = Math.atan2(input.aimPoint.x - this.pos.x, input.aimPoint.z - this.pos.z);
        this.facing = lerpAngle(this.facing, target, Math.min(1, dt * 16));
      } else if (mLen > 0.1 && !lateral) {
        const target = Math.atan2(mx, mz);
        this.facing = lerpAngle(this.facing, target, Math.min(1, dt * 10));
      }
    }

    // --- velocity
    let speed = cfg.baseSpeed * st.speed;
    if (this.latched) speed *= 0.55;
    else if (this.vacuumActive) speed *= 0.75;
    const tvx = mx * speed;
    const tvz = mz * speed;
    const acc = mLen > 0.05 ? cfg.accel : cfg.friction;
    this.vel.x += (tvx - this.vel.x) * Math.min(1, acc * dt * 0.5);
    this.vel.z += (tvz - this.vel.z) * Math.min(1, acc * dt * 0.5);
    this.tugInput.set(mx, 0, mz);

    // ghost drags the hero during tug-of-war (Lars's anchor resists); every
    // extra ghost in the pull adds its weight, so group catches fight harder
    if (this.latched) {
      const pull = this.latched.currentPull(this.tmp2);
      const resist = (1 - st.anchor) * (1 + CONFIG.vacuum.groupPull * this.extraLatched.length);
      this.vel.x += pull.x * resist * dt * 4;
      this.vel.z += pull.z * resist * dt * 4;
    }

    this.knock.multiplyScalar(Math.max(0, 1 - dt * 6));
    this.pos.x += (this.vel.x + this.knock.x) * dt;
    this.pos.z += (this.vel.z + this.knock.z) * dt;
    this.pos.y = 0;
    this.mansion.resolveCircle(this.pos, this.radius);

    const planar = Math.hypot(this.vel.x, this.vel.z);
    this.speed01 = Math.min(1, planar / (cfg.baseSpeed * 1.1));

    // footsteps (Reshman is nearly silent)
    if (planar > 0.8) {
      this.footTimer -= dt * (planar / cfg.baseSpeed);
      if (this.footTimer <= 0) {
        this.footTimer = cfg.footstepInterval;
        if (this.sound) this.sound.footstep(Math.min(1, st.noise) * 0.9, true, this.speed01);
        if (game) game.onFootstep(this);
      }
    }

    // --- flashlight (GameCube style): a steady beam toggled on/off. Any ghost
    // caught in the beam while its heart is showing is stunned. Switching the
    // light ON with a full charge also fires a bright surge (Strobulb charge).
    const fl = CONFIG.flashlight;
    this.flashCharge = Math.min(1, this.flashCharge + dt / (fl.rechargeTime * st.stunRecharge));
    this.flashBurst = Math.max(0, this.flashBurst - dt);
    if (input.flashPressed && !this.latched) {
      this.lightOn = !this.lightOn;
      if (this.lightOn && this.flashCharge >= 1) {
        this.flashCharge = 0;
        this.flashBurst = fl.burstTime;
        if (this.sound) this.sound.flash();
        if (game) game.onFlash(this);
      } else if (this.sound) {
        this.sound.flashClick(this.lightOn);
      }
    } else if (input.flashPressed && this.sound) {
      this.sound.flashClick(false);
    }
    if (this.lightOn && !this.latched && game) game.onBeam(this, dt);

    // --- vacuum
    this.vacuumActive = !!input.vacuumHeld;
    const ramp = this.vacuumActive ? dt * CONFIG.vacuum.suctionRampUp : -dt * 4;
    this.vacuumPower = THREE.MathUtils.clamp(this.vacuumPower + ramp, 0, input.vacuumDepth !== undefined ? input.vacuumDepth : 1);
    if (!this.vacuumActive && this.latched) {
      this.latched.onLatchBroken(game, false);
      this.release();
    }
    if (this.sound) this.sound.setVacuum(this.vacuumPower > 0.02, this.vacuumPower, !!this.latched);

    // the flashlight drifts slowly during a tug so it doesn't whip around with
    // every thrash, then catches back up with the body once the pull ends
    this.lightYaw = lerpAngle(this.lightYaw, this.facing, Math.min(1, dt * (this.latched ? 2.2 : 18)));

    this.syncRig();
    this.updateVisuals(dt, t);
    this.updateCats(dt, t);
  }

  updateVisuals(dt, t) {
    const fl = CONFIG.flashlight;
    // flashlight beam + strobe burst
    const burstK = this.flashBurst > 0 ? this.flashBurst / fl.burstTime : 0;
    const lit = this.lightOn ? 1 : 0;
    // softer light while pulling, so the room isn't strobing as the ghost thrashes
    this.tugDim = THREE.MathUtils.lerp(this.tugDim === undefined ? 1 : this.tugDim, this.latched ? 0.6 : 1, Math.min(1, dt * 4));
    this.spot.intensity = (fl.beamIntensity * lit + fl.burstIntensity * burstK) * this.tugDim;
    this.spot.angle = this.beamAngle * (1 + burstK * 0.35);
    this.coneMat.uniforms.uOpacity.value = 0.1 + burstK * 0.35 + (this.flashCharge >= 1 ? 0.03 : 0);
    this.coneMat.uniforms.uBurst.value = burstK;
    this.cone.visible = !this.latched && this.lightOn;
    this.flare.material.uniforms.uStrength.value = (this.cone.visible ? 0.55 : 0) + burstK * 2.2;
    this.flare.visible = this.flare.material.uniforms.uStrength.value > 0.01;
    if (this.parts.flashLens) this.parts.flashLens.material.emissiveIntensity = (this.lightOn ? 1 : 0.1) + burstK * 4;

    // suction stream
    const N = this.streamN;
    const on = this.vacuumPower;
    this.streamMat.opacity = on * 0.9;
    let length = CONFIG.vacuum.range;
    if (this.latched) length = Math.min(CONFIG.vacuum.breakDistance, Math.hypot(this.latched.pos.x - this.pos.x, this.latched.pos.z - this.pos.z));
    const ny = this.nozzleLocal.y;
    const targetY = this.latched ? this.latched.pos.y : 0.9;
    const nx = this.nozzleLocal.x;
    for (let i = 0; i < N; i++) {
      const s = this.streamSeed;
      // particles travel from far end toward the nozzle
      let u = (s[i * 3] - t * (0.9 + 0.8 * on) * s[i * 3 + 2]) % 1;
      if (u < 0) u += 1;
      const z = this.nozzleLocal.z + u * length;
      const spread = this.latched ? 0.12 + u * 0.25 : 0.1 + u * Math.tan(0.55) * length * 0.35;
      const a = s[i * 3 + 1] + t * 9 + u * 12;
      const jitter = this.char.id === 'milo' && this.latched ? (Math.random() - 0.5) * 0.3 : 0;
      this.streamPos[i * 3] = nx * (1 - u) + Math.cos(a) * spread + jitter;
      this.streamPos[i * 3 + 1] = ny + (targetY - ny) * u + Math.sin(a) * spread * 0.6 + jitter;
      this.streamPos[i * 3 + 2] = z;
    }
    this.stream.geometry.attributes.position.needsUpdate = true;
    this.stream.visible = on > 0.02;

    // vortex: stretch the unit cone from the nozzle to the end of the stream
    const vx = this.vortex;
    vx.visible = on > 0.02;
    if (vx.visible) {
      const endR = this.latched ? 0.3 : 0.1 + Math.tan(0.55) * length * 0.35;
      vx.scale.set(endR, endR, length);
      vx.rotation.y = Math.atan2(-nx, length);
      vx.rotation.x = Math.atan2(ny - targetY, length);
      vx.material.uniforms.uPower.value = on * (this.latched ? 1.2 : 0.85);
      vx.material.uniforms.uSpeed.value = this.latched ? 1.6 : on;
    }

    // tethers during tug-of-war (lead ghost + any extras in the same pull)
    const held = this.latched ? [this.latched, ...this.extraLatched] : [];
    const a = this.nozzleWorld(this.tmp);
    for (let k = 0; k < this.tethers.length; k++) {
      const line = this.tethers[k];
      const g = held[k];
      line.visible = !!g;
      if (!g) continue;
      const b = g.pos;
      const P = line.geometry.attributes.position.array;
      for (let i = 0; i < 24; i++) {
        const q = i / 23;
        const wob = Math.sin(q * Math.PI) * 0.25;
        P[i * 3] = a.x + (b.x - a.x) * q + Math.sin(t * 25 + i + k * 2) * wob * 0.4;
        P[i * 3 + 1] = a.y + (b.y - a.y) * q + Math.sin(q * Math.PI) * 0.15 + Math.cos(t * 30 + i) * wob * 0.3;
        P[i * 3 + 2] = a.z + (b.z - a.z) * q + Math.cos(t * 22 + i + k) * wob * 0.4;
      }
      line.geometry.attributes.position.needsUpdate = true;
    }

    // hero animation & invulnerability blink
    this.animateModel(t, this.speed01, dt);
    if (this.latched) {
      this.model.rotation.z = Math.sin(t * 30) * 0.03;
      this.model.rotation.x = -0.12;
    } else {
      this.model.rotation.z = 0;
      this.model.rotation.x = this.vacuumActive ? -0.05 : 0;
    }
    this.model.visible = this.invuln > 0 ? Math.floor(this.invuln * 14) % 2 === 0 : true;
  }

  updateCats(dt, t) {
    for (const c of this.cats) {
      const target = this.tmp.copy(c.offset).applyAxisAngle(UP, this.facing).add(this.pos);
      const p = c.group.position;
      const dx = target.x - p.x;
      const dz = target.z - p.z;
      const d = Math.hypot(dx, dz);
      const sp = d > 0.4 ? Math.min(9, d * 3.2) : 0;
      if (d > 0.01) {
        c.vel.set((dx / d) * sp, 0, (dz / d) * sp);
        p.addScaledVector(c.vel, dt);
        if (sp > 0.2) c.group.rotation.y = lerpAngle(c.group.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 8));
      }
      if (d > 8) p.copy(target);
      this.mansion.resolveCircle(p, 0.2);
      c.animate(t, Math.min(1, sp / 6), dt);
    }
  }

  dispose() {
    this.scene.remove(this.model);
    this.scene.remove(this.aimRig);
    this.tethers.forEach((l) => this.scene.remove(l));
    this.cats.forEach((c) => this.scene.remove(c.group));
    if (this.sound) this.sound.setVacuum(false);
    this.spot.shadow.map && this.spot.shadow.map.dispose();
    for (const m of [this.cone, this.flare, this.vortex]) {
      m.geometry.dispose();
      m.material.dispose();
    }
  }
}

export function lerpAngle(a, b, t) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
