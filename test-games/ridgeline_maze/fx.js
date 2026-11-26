// Ridgeline effects: pooled sprite particles for dust, sparks, wisps, flashes and confetti.
import { THREE, scene, flake } from './world.js';

const POOL = 420;
const square = (() => { const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(2, 4, 12, 8); return new THREE.CanvasTexture(c); })();
const parts = [];
for (let i = 0; i < POOL; i++) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flake, transparent: true, depthWrite: false }));
  s.visible = false; s.renderOrder = 3; scene.add(s);
  parts.push({ s, life: 0, max: 1, v: new THREE.Vector3(), g: 0, drag: 0, s0: 1, s1: 1, a: 1, spin: 0 });
}
let cursor = 0;
function emit(o) {
  let p = null;
  for (let n = 0; n < POOL; n++) { const q = parts[(cursor + n) % POOL]; if (q.life <= 0) { p = q; cursor = (cursor + n + 1) % POOL; break; } }
  if (!p) { p = parts[cursor]; cursor = (cursor + 1) % POOL; }
  const m = p.s.material;
  m.map = o.map || flake; m.color.set(o.color ?? 0xffffff);
  m.blending = o.add ? THREE.AdditiveBlending : THREE.NormalBlending; m.toneMapped = !o.add; m.rotation = Math.random() * 6.28;
  p.s.position.set(o.x, o.y, o.z); p.v.set(o.vx || 0, o.vy || 0, o.vz || 0);
  Object.assign(p, { life: o.life, max: o.life, g: o.g || 0, drag: o.drag ?? 2, s0: o.s0, s1: o.s1 ?? o.s0, a: o.a ?? 1, spin: o.spin || 0, floor: o.y < 4 ? .03 : o.drop !== undefined ? o.y - o.drop : -1e9 }); // up on the mountain the floor is the ledge or camp you are on
  p.s.scale.setScalar(o.s0); p.s.visible = true;
}
const rnd = (a = 1) => (Math.random() - .5) * 2 * a;

export const fx = {
  /** Puff of snow/dust spreading out along the ground. */
  dust(x, y, z, n = 12, power = 1, color = 0xf1f5fa) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28, sp = (1.2 + Math.random() * 1.8) * power;
      emit({ x: x + Math.cos(a) * .2, y: y + .1, z: z + Math.sin(a) * .2, vx: Math.cos(a) * sp, vy: .4 + Math.random() * .8 * power, vz: Math.sin(a) * sp, life: .6 + Math.random() * .5, s0: .35 * power, s1: 1.3 * power, a: .75, drag: 3.5, color });
    }
  },
  /** Snow kicked up behind a running foot. */
  kick(x, y, z, dx, dz) {
    for (let i = 0; i < 3; i++) emit({ x: x + rnd(.15), y: y + .05, z: z + rnd(.15), vx: -dx * 1.5 + rnd(.6), vy: 1 + Math.random(), vz: -dz * 1.5 + rnd(.6), life: .45, s0: .15, s1: .45, a: .8, g: 6, drag: 1.5, drop: .05 });
  },
  /** Coloured chalk dust bursting off a surface. */
  chalk(x, y, z, nx, ny, nz, color) {
    for (let i = 0; i < 14; i++) emit({ x, y, z, vx: nx * 1.5 + rnd(1.2), vy: ny * 1.5 + rnd(1.2) + .3, vz: nz * 1.5 + rnd(1.2), life: .5 + Math.random() * .4, s0: .12, s1: .3, add: true, color, g: 3, drag: 3 });
  },
  /** Twinkling sparkles drifting upwards. */
  sparkle(x, y, z, color = 0xffffff, n = 12) {
    for (let i = 0; i < n; i++) emit({ x: x + rnd(.4), y: y + Math.random() * .4, z: z + rnd(.4), vx: rnd(.4), vy: .6 + Math.random() * 1.2, vz: rnd(.4), life: .7 + Math.random() * .7, s0: .25, s1: .02, add: true, color, drag: 1.2 });
  },
  /** Dark purple smoke curling up from someone the Shadow took. */
  wisps(x, y, z, n = 26) {
    for (let i = 0; i < n; i++) emit({ x: x + rnd(.5), y: y + Math.random() * 1.2, z: z + rnd(.5), vx: rnd(.5), vy: .8 + Math.random() * 1.4, vz: rnd(.5), life: 1.4 + Math.random(), s0: .4, s1: 1.6, a: .7, color: i % 3 ? 0x6a2fbf : 0xb48cff, add: i % 3 === 0, drag: .8 });
  },
  /** Expanding flash, e.g. when a door unlocks. */
  ring(x, y, z, color = 0xffd23f) {
    emit({ x, y, z, life: .6, s0: 1, s1: 9, add: true, color, a: .9, drag: 0 });
    emit({ x, y, z, life: .35, s0: .5, s1: 4, add: true, color: 0xffffff, a: 1, drag: 0 });
  },
  /** Confetti cannon. */
  confetti(x, y, z, n = 90, drop = 1.45) { // drop: how far below the cannon the ground is
    const cols = [0xff6f59, 0xffd23f, 0x2ec4f1, 0x8ee34d, 0xa37bff, 0xff5fa2];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28, sp = 2 + Math.random() * 4;
      emit({ x, y, z, map: square, vx: Math.cos(a) * sp, vy: 6 + Math.random() * 6, vz: Math.sin(a) * sp, life: 2.4 + Math.random() * 1.4, s0: .22, s1: .2, color: cols[i % cols.length], g: 7, drag: 1.4, spin: rnd(12), drop: drop });
    }
  },
};

export function updateFx(dt) {
  for (const p of parts) {
    if (p.life <= 0) continue;
    p.life -= dt;
    if (p.life <= 0) { p.s.visible = false; continue; }
    p.v.y -= p.g * dt; p.v.multiplyScalar(Math.max(0, 1 - p.drag * dt));
    p.s.position.addScaledVector(p.v, dt);
    if (p.s.position.y < p.floor) { p.s.position.y = p.floor; p.v.y = 0; p.v.x *= .9; p.v.z *= .9; }
    const k = 1 - p.life / p.max;
    p.s.scale.setScalar(p.s0 + (p.s1 - p.s0) * k);
    p.s.material.opacity = p.a * (k < .12 ? k / .12 : 1 - (k - .12) / .88);
    p.s.material.rotation += p.spin * dt;
  }
}
