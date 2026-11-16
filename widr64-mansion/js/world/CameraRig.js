// ==========================================================
// CameraRig.js — fixed-angle elevated "dollhouse" camera that
// smoothly follows the hero, clamps to the current room, pans
// toward doors as they creak open, and supports screen shake.
// ==========================================================
import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { CONFIG } from '../config.js';

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.look = new THREE.Vector3();
    this.desired = new THREE.Vector3();
    this.focusPoint = new THREE.Vector3();
    this.focusTime = 0;
    this.focusDuration = 0;
    this.trauma = 0;
    this.shakeOffset = new THREE.Vector3();
    this.time = 0;
    this.zoom = 1;
    this.zoomTarget = 1;
    this.roomBounds = null;
    this.boundsBlend = { minX: -100, maxX: 100, minZ: -100, maxZ: 100 };
    this.boundsSnap = true; // next update jumps straight to the room's bounds
    this.shakeScale = 1; // Options → Vibration (screen shake) on/off
  }

  snap(pos) {
    this.look.copy(pos);
    this.apply();
  }

  // floor changes / new runs: forget the old room so the camera doesn't glide across the map
  resetBounds() {
    this.boundsSnap = true;
    this.focusTime = 0;
    this.trauma = 0;
  }

  // smooth door-opening pan: look at the doorway for a moment
  focusOn(point, duration = CONFIG.camera.doorPanTime) {
    this.focusPoint.copy(point);
    this.focusTime = duration;
    this.focusDuration = duration;
  }

  shake(amount) {
    this.trauma = Math.min(1, this.trauma + amount * this.shakeScale);
    // controller rumble mirrors every screen shake (same Vibration option)
    if (this.onShake && this.shakeScale > 0) this.onShake(amount);
  }

  setZoom(z) {
    this.zoomTarget = z;
  }

  update(dt, playerPos, facingDir, room) {
    this.time += dt;
    const cfg = CONFIG.camera;

    this.desired.copy(playerPos);
    if (facingDir) {
      this.desired.x += facingDir.x * cfg.lookAhead;
      this.desired.z += facingDir.z * cfg.lookAhead * 0.6;
    }

    // ease room bounds so transitions between rooms glide instead of snapping
    if (room) {
      const pad = cfg.roomEdgePadding;
      const target = {
        minX: room.minX + pad, maxX: room.maxX - pad,
        minZ: room.minZ + pad * 0.6, maxZ: room.maxZ - pad * 0.4,
      };
      const k = Math.min(1, dt * 2.5);
      for (const key of ['minX', 'maxX', 'minZ', 'maxZ']) {
        const cur = this.boundsBlend[key];
        this.boundsBlend[key] = this.boundsSnap ? target[key] : cur + (target[key] - cur) * k;
      }
      this.boundsSnap = false;
    }
    const b = this.boundsBlend;
    if (b.maxX > b.minX) this.desired.x = THREE.MathUtils.clamp(this.desired.x, b.minX, b.maxX);
    else this.desired.x = (b.minX + b.maxX) / 2;
    if (b.maxZ > b.minZ) this.desired.z = THREE.MathUtils.clamp(this.desired.z, b.minZ, b.maxZ);
    else this.desired.z = (b.minZ + b.maxZ) / 2;

    if (this.focusTime > 0) {
      this.focusTime -= dt;
      const p = 1 - this.focusTime / this.focusDuration;
      // ease in, hold, ease out
      const w = Math.sin(Math.min(1, Math.max(0, p)) * Math.PI);
      this.desired.lerp(this.focusPoint, w * 0.75);
    }

    const k = 1 - Math.exp(-cfg.followLerp * dt);
    this.look.lerp(this.desired, k);
    this.zoom += (this.zoomTarget - this.zoom) * Math.min(1, dt * 2);

    // trauma-based shake
    this.trauma = Math.max(0, this.trauma - cfg.shakeDecay * dt);
    const s = this.trauma * this.trauma * cfg.maxShake;
    const t = this.time * 38;
    this.shakeOffset.set(
      (Math.sin(t * 1.1) + Math.sin(t * 2.3) * 0.5) * s,
      (Math.sin(t * 1.7 + 1) + Math.sin(t * 3.1) * 0.4) * s * 0.6,
      (Math.sin(t * 1.3 + 2)) * s * 0.5,
    );
    this.apply();
  }

  apply() {
    const cfg = CONFIG.camera;
    const cam = this.camera;
    cam.position.set(
      this.look.x + this.shakeOffset.x,
      this.look.y + cfg.height * this.zoom + this.shakeOffset.y,
      this.look.z + cfg.distance * this.zoom + this.shakeOffset.z,
    );
    cam.lookAt(this.look.x + this.shakeOffset.x * 0.5, this.look.y + 0.6, this.look.z - 0.4);
  }
}
