import { THREE, scene, toon, addOutline, V3, damp, puff } from './core.js?v=sub1';
import { addCookie } from './cookies.js?v=sub1';

// Ordinary enemies, shared by every planet. Each planet makes its own set and spawns its own kinds.
//   kruiper  – blob that wanders, and chases you once it spots you. Stomp it.
//   vleermuis – hangs in the air, swoops down at where you stand, flies back up. Stomp it.
//   kever    – rock beetle: spots you, scrapes its feet, then charges in a straight line.
//              A normal stomp just bounces off its shell; a ground pound cracks it.
//   gooier   – snow imp on a fixed spot that lobs snowballs at you. Stomp it.
//   (and per planet: sporenblazer, springslak, gloeiworm, blikbot – see below)
// api: { damage(from), bounce(vy), toast(msg) }

const ink = new THREE.MeshBasicMaterial({ color: 0x15162a });
const mk = (geo, mat, x, y, z, parent, ol = 1.08) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true;
  if (ol) addOutline(m, ol); parent.add(m); return m;
};
function eyes(parent, y, z, gap, r, mat) {
  return [-1, 1].map((s) => { const e = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat); e.position.set(gap * s, y, z); e.scale.z = 0.5; parent.add(e); return e; });
}
// little "!" when an enemy notices you
function alertMark(parent, y) {
  const g = new THREE.Group(); g.position.y = y; g.visible = false; parent.add(g);
  const m = new THREE.MeshBasicMaterial({ color: 0xff5a36 });
  mk(new THREE.BoxGeometry(0.14, 0.42, 0.14), m, 0, 0.18, 0, g, 1.2);
  mk(new THREE.BoxGeometry(0.14, 0.14, 0.14), m, 0, -0.18, 0, g, 1.2);
  return g;
}

const KINDS = {
  kruiper: {
    r: 0.55, h: 0.9, speed: 1.4, chase: 4.2, see: 7, coins: 2,
    build(g, o) {
      const body = toon(o.color ?? 0x3d3558); body.emissive.set(o.glow ?? 0x140f28);
      const blob = mk(new THREE.SphereGeometry(0.55, 16, 12), body, 0, 0.5, 0, g);
      blob.scale.set(1, 0.85, 1);
      for (let i = 0; i < 5; i++) {      // misty tendrils at the bottom
        const a = (i / 5) * Math.PI * 2;
        mk(new THREE.SphereGeometry(0.2, 8, 6), body, Math.cos(a) * 0.45, 0.14, Math.sin(a) * 0.45, g, 0);
      }
      eyes(g, 0.62, 0.48, 0.2, 0.11, new THREE.MeshBasicMaterial({ color: o.eye ?? 0xffe27a }));
      return { wobble: blob };
    },
  },
  vleermuis: {
    r: 0.6, h: 0.6, speed: 2, swoop: 10, see: 8, coins: 1, fly: 3.2,
    build(g, o) {
      const fur = toon(o.color ?? 0x463c5e);
      mk(new THREE.SphereGeometry(0.34, 12, 10), fur, 0, 0.3, 0, g);
      [-1, 1].forEach((s) => mk(new THREE.ConeGeometry(0.1, 0.28, 5), fur, 0.16 * s, 0.66, 0, g, 0));
      eyes(g, 0.36, 0.3, 0.12, 0.07, new THREE.MeshBasicMaterial({ color: o.eye ?? 0xff8a5a }));
      const wingMat = toon(o.wing ?? 0x2e2740);
      const wings = [-1, 1].map((s) => {
        const p = new THREE.Group(); p.position.set(0.25 * s, 0.35, 0); g.add(p);
        const w = mk(new THREE.BoxGeometry(0.75, 0.05, 0.42), wingMat, 0.38 * s, 0, 0, p, 1.04);
        w.rotation.z = 0.2 * s;
        return { p, s };
      });
      return { wings };
    },
  },
  kever: {
    r: 0.8, h: 1, speed: 1.2, charge: 10, see: 9, coins: 3, armored: true,
    build(g, o) {
      const shell = toon(o.color ?? 0x8a7f74), dark = toon(0x4a423c);
      const s = mk(new THREE.SphereGeometry(0.8, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), shell, 0, 0.25, 0, g);
      s.scale.set(1, 0.95, 1.2);
      mk(new THREE.BoxGeometry(0.06, 0.78, 1.7), dark, 0, 0.58, 0, s.parent, 0).rotation.x = 0;
      const head = mk(new THREE.SphereGeometry(0.32, 10, 8), dark, 0, 0.3, 0.9, g);
      [-1, 1].forEach((s2) => mk(new THREE.ConeGeometry(0.06, 0.4, 5), toon(0xd9d2c4), 0.18 * s2, 0.38, 1.2, g, 0).rotation.x = Math.PI / 2);
      eyes(head, 0.06, 0.26, 0.13, 0.07, new THREE.MeshBasicMaterial({ color: 0xffd166 }));
      const legs = [];
      for (const sz of [-0.4, 0, 0.4]) for (const sx of [-1, 1]) {
        const l = mk(new THREE.BoxGeometry(0.5, 0.08, 0.08), dark, 0.75 * sx, 0.12, sz, g, 0);
        l.rotation.z = -0.4 * sx; legs.push(l);
      }
      return { legs, head };
    },
  },
  gooier: {
    r: 0.5, h: 1.1, see: 15, coins: 2, still: true,
    build(g, o) {
      const fur = toon(o.fur ?? 0xf4f7fb), hat = toon(o.hat ?? 0x3d7fd8);
      const b = mk(new THREE.SphereGeometry(0.45, 14, 10), fur, 0, 0.45, 0, g);
      b.scale.set(1, 1.05, 1);
      const head = mk(new THREE.SphereGeometry(0.3, 12, 10), fur, 0, 0.98, 0, g);
      mk(new THREE.ConeGeometry(0.3, 0.5, 10), hat, 0, 1.38, 0, g, 1.06);
      mk(new THREE.SphereGeometry(0.09, 8, 6), toon(0xffffff), 0, 1.65, 0, g, 0);
      eyes(head, 0.04, 0.26, 0.11, 0.06, ink);
      const arm = new THREE.Group(); arm.position.set(0.42, 0.62, 0); g.add(arm);
      mk(new THREE.CylinderGeometry(0.08, 0.08, 0.5), fur, 0, 0.25, 0, arm, 0);
      const ball = mk(new THREE.SphereGeometry(0.2, 10, 8), toon(o.ball ?? 0xffffff), 0, 0.55, 0, arm, 1.1);
      return { arm, ball };
    },
  },
  // sporenblazer – a grumpy mushroom on a fixed spot: swells up when you come close, then puffs a cloud of spores
  sporenblazer: {
    r: 0.6, h: 1.2, see: 4.5, coins: 2, still: true,
    build(g) {
      const stem = toon(0xe8dcc8), cap = toon(0xb6e36b); cap.emissive.set(0x1a3008);
      mk(new THREE.CylinderGeometry(0.32, 0.4, 0.7, 10), stem, 0, 0.35, 0, g);
      const c = mk(new THREE.SphereGeometry(0.62, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), cap, 0, 0.7, 0, g);
      c.scale.y = 0.75;
      eyes(g, 0.48, 0.33, 0.13, 0.07, ink);
      const brow = mk(new THREE.BoxGeometry(0.42, 0.06, 0.04), ink, 0, 0.6, 0.36, g, 0);
      return { cap: c, brow };
    },
  },
  // springslak – a snail that hops at you in big arcs
  springslak: {
    r: 0.55, h: 0.9, see: 8, coins: 2,
    build(g) {
      const body = toon(0x7ad9c8), shell = toon(0xff7ab6); shell.emissive.set(0x3a0a28);
      const b = mk(new THREE.CapsuleGeometry(0.22, 0.6, 4, 10), body, 0, 0.22, 0.05, g); b.rotation.x = Math.PI / 2;
      const s = mk(new THREE.SphereGeometry(0.42, 14, 10), shell, 0, 0.55, -0.15, g); s.scale.set(0.8, 1, 1);
      mk(new THREE.TorusGeometry(0.22, 0.05, 6, 16), toon(0xffd166), 0.33, 0.55, -0.15, g, 0).rotation.y = Math.PI / 2;
      for (const sx of [-1, 1]) {
        const st = mk(new THREE.CylinderGeometry(0.03, 0.03, 0.3), body, 0.08 * sx, 0.5, 0.45, g, 0); st.rotation.x = 0.4;
        const e = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), ink); e.position.set(0.08 * sx, 0.67, 0.52); g.add(e);
      }
      return {};
    },
  },
  // blikbot – a tin can on wheels: rolls a patrol, stops when it spots you, blinks its antenna and fires a slow
  // ball of electricity straight at you (it flies level, so jump over it or step aside)
  blikbot: {
    r: 0.5, h: 1.3, speed: 1.6, see: 11, coins: 2,
    build(g, o) {
      const tin = toon(o.color ?? 0x9aa4b0), dark = toon(0x4a4e58);
      const can = mk(new THREE.CylinderGeometry(0.42, 0.42, 0.8, 14), tin, 0, 0.62, 0, g);
      mk(new THREE.TorusGeometry(0.42, 0.04, 6, 18), dark, 0, 0.9, 0, g, 0).rotation.x = Math.PI / 2;
      mk(new THREE.TorusGeometry(0.42, 0.04, 6, 18), dark, 0, 0.34, 0, g, 0).rotation.x = Math.PI / 2;
      const head = mk(new THREE.SphereGeometry(0.36, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), tin, 0, 1.02, 0, g);
      const eye = new THREE.MeshBasicMaterial({ color: 0xff3a3a });
      mk(new THREE.SphereGeometry(0.11, 10, 8), eye, 0, 1.12, 0.3, g, 0);
      mk(new THREE.CylinderGeometry(0.02, 0.02, 0.4), dark, 0, 1.55, 0, g, 0);
      const tipMat = new THREE.MeshBasicMaterial({ color: 0xffe14a });
      const tip = mk(new THREE.SphereGeometry(0.08, 8, 6), tipMat, 0, 1.78, 0, g, 0);
      for (const sx of [-1, 1]) mk(new THREE.CylinderGeometry(0.17, 0.17, 0.12, 12), dark, 0.42 * sx, 0.17, 0, g, 0).rotation.z = Math.PI / 2;
      return { head, tip, tipMat };
    },
  },
  // gloeiworm – hides under the ground (a glowing bump gives it away), shoots up when you're close, then dives again
  gloeiworm: {
    r: 0.5, h: 1.6, see: 3.4, coins: 3, still: true,
    build(g) {
      const m = toon(0xffa24a); m.emissive.set(0x4a1a00);
      const segs = [];
      for (let i = 0; i < 4; i++) segs.push(mk(new THREE.SphereGeometry(0.34 - i * 0.03, 12, 10), m, 0, 0.3 + i * 0.36, 0, g));
      eyes(segs[3], 0.06, 0.24, 0.11, 0.06, ink);
      const mound = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffc46b }));
      mound.scale.y = 0.35; g.parent.add(mound);
      return { segs, mound };
    },
  },
};

const snowGeo = new THREE.SphereGeometry(0.32, 12, 10), snowMat = toon(0xffffff);
const boltGeo = new THREE.SphereGeometry(0.22, 10, 8), boltMat = new THREE.MeshBasicMaterial({ color: 0xffe14a });
const sporeMat = new THREE.MeshBasicMaterial({ color: 0xb6e36b, transparent: true, opacity: 0.5, depthWrite: false });

export function enemySet({ groundAt, boxes }) {
  const list = [], shots = [], clouds = [];
  const blocked = (x, z, y, r) => boxes.some((b) => !b.crate && x + r > b.min.x && x - r < b.max.x && z + r > b.min.z && z - r < b.max.z && y + 0.5 > b.min.y && y < b.max.y);

  function spawn(kind, x, z, o = {}) {
    const K = KINDS[kind];
    const root = new THREE.Group(); scene.add(root);
    const g = new THREE.Group(); root.add(g);
    const parts = K.build(g, o);
    const y = o.y ?? groundAt(x, z, 0);
    const e = {
      kind, K, o, root, g, parts, mark: alertMark(root, K.h + 0.6),
      home: V3(x, y, z), pos: V3(x, y + (K.fly || 0), z), yaw: Math.random() * 6, state: 'idle', t: Math.random() * 3,
      wander: Math.random() * 6, dir: V3(), roam: o.roam ?? 5, dead: false, deadT: 0, aim: V3(), fireT: 1 + Math.random(),
    };
    root.position.copy(e.pos);
    list.push(e);
    return e;
  }

  function kill(e, api) {
    e.dead = true; e.deadT = 0; e.state = 'squash';
    puff(e.pos.clone().add(V3(0, 0.4, 0)), 14, e.kind === 'gooier' ? 0xffffff : e.kind === 'kever' ? 0x9a948a : 0x8a7fb0, 4, 2);
    for (let i = 0; i < e.K.coins; i++) {
      const a = (i / e.K.coins) * Math.PI * 2 + e.yaw;
      addCookie(e.pos.x + Math.cos(a) * 0.8, groundAt(e.pos.x, e.pos.z, 0) + 0.9, e.pos.z + Math.sin(a) * 0.8, '', 'drop');
    }
  }

  // walk on the terrain without falling off ledges or into houses; returns false if the way is blocked
  function step(e, dx, dz) {
    const nx = e.pos.x + dx, nz = e.pos.z + dz;
    const g0 = groundAt(e.pos.x, e.pos.z, 0), g1 = groundAt(nx, nz, e.K.r * 0.6);
    if (Math.abs(g1 - g0) > 0.6 || blocked(nx, nz, g0, e.K.r * 0.8)) return false;
    e.pos.x = nx; e.pos.z = nz; e.pos.y += (g1 - e.pos.y) * 0.5;
    return true;
  }
  const turnTo = (e, x, z, k) => { const d = Math.atan2(x - e.pos.x, z - e.pos.z) - e.yaw; e.yaw += Math.atan2(Math.sin(d), Math.cos(d)) * k; };

  function update(dt, t, P, prevY, api, invulnerable) {
    const p = P.pos, chest = p.clone().add(V3(0, 0.8, 0));
    for (const e of list) {
      const K = e.K;
      if (e.dead) {
        e.deadT += dt;
        if (e.state === 'squash') {
          e.g.scale.set(1 + e.deadT * 3, Math.max(0.05, 1 - e.deadT * 6), 1 + e.deadT * 3);
          if (e.deadT > 0.3) { e.root.visible = false; e.state = 'gone'; }
        }
        // comes back after a while, but never right under your nose
        if (e.state === 'gone' && e.deadT > 35 && p.distanceTo(e.home) > 22) {
          e.dead = false; e.state = 'idle'; e.root.visible = true; e.g.scale.set(1, 1, 1);
          e.pos.copy(e.home); e.pos.y += K.fly || 0; puff(e.pos.clone(), 8, 0xffffff, 2, 1);
        }
        continue;
      }
      e.t += dt;
      const dist = Math.hypot(p.x - e.pos.x, p.z - e.pos.z);
      const sameLevel = Math.abs(p.y - groundAt(e.pos.x, e.pos.z, 0)) < 2.2;
      const sees = dist < K.see && (e.kind === 'vleermuis' || e.kind === 'gooier' || sameLevel);

      if (e.kind === 'kruiper') {
        if (e.state === 'idle') {
          e.wander -= dt;
          if (e.wander <= 0) { e.wander = 2 + Math.random() * 3; e.yaw += (Math.random() - 0.5) * 3; }
          const back = e.pos.distanceTo(e.home) > e.roam;
          if (back) turnTo(e, e.home.x, e.home.z, damp(3, dt));
          if (!step(e, Math.sin(e.yaw) * K.speed * dt, Math.cos(e.yaw) * K.speed * dt)) e.yaw += 2;
          if (sees) { e.state = 'alert'; e.t = 0; }
        } else if (e.state === 'alert') {
          turnTo(e, p.x, p.z, damp(10, dt));
          e.g.position.y = Math.sin(Math.min(1, e.t / 0.4) * Math.PI) * 0.5;
          if (e.t > 0.45) { e.state = 'chase'; e.t = 0; }
        } else if (e.state === 'chase') {
          turnTo(e, p.x, p.z, damp(5, dt));
          step(e, Math.sin(e.yaw) * K.chase * dt, Math.cos(e.yaw) * K.chase * dt);
          if (!sees || e.pos.distanceTo(e.home) > e.roam + 9) { e.state = 'idle'; e.wander = 0; }
        }
        e.parts.wobble.scale.y = 0.85 + Math.sin(t * 8 + e.home.x) * 0.06;
      } else if (e.kind === 'vleermuis') {
        if (e.state === 'idle') {
          const a = t * 0.8 + e.home.x;
          e.pos.x += (e.home.x + Math.cos(a) * 2.5 - e.pos.x) * damp(2, dt);
          e.pos.z += (e.home.z + Math.sin(a) * 2.5 - e.pos.z) * damp(2, dt);
          e.pos.y += (e.home.y + K.fly + Math.sin(t * 2) * 0.3 - e.pos.y) * damp(2, dt);
          turnTo(e, p.x, p.z, damp(3, dt));
          if (sees && e.t > 1.5 && p.y < e.pos.y + 1) { e.state = 'alert'; e.t = 0; }
        } else if (e.state === 'alert') {
          e.pos.y += dt * 1.5;   // pulls up before diving: your cue to move
          turnTo(e, p.x, p.z, damp(10, dt));
          if (e.t > 0.6) { e.state = 'swoop'; e.t = 0; e.aim.copy(p).add(V3(0, 0.6, 0)); }
        } else if (e.state === 'swoop') {
          const d = e.aim.clone().sub(e.pos), l = d.length();
          if (l < 0.4 || e.t > 1.6) { e.state = 'rise'; e.t = 0; }
          else e.pos.addScaledVector(d, Math.min(1, (K.swoop * dt) / l));
        } else if (e.state === 'rise') {
          e.pos.lerp(V3(e.home.x, e.home.y + K.fly, e.home.z), damp(1.5, dt));
          if (e.t > 1.6) { e.state = 'idle'; e.t = 0; }
        }
        const flap = Math.sin(t * (e.state === 'swoop' ? 8 : 18)) * (e.state === 'swoop' ? 0.2 : 0.7);
        e.parts.wings.forEach(({ p: w, s }) => (w.rotation.z = s * flap + (e.state === 'swoop' ? -0.6 * s : 0)));
      } else if (e.kind === 'kever') {
        if (e.state === 'idle') {
          e.wander -= dt;
          if (e.wander <= 0) { e.wander = 2.5 + Math.random() * 3; e.yaw += (Math.random() - 0.5) * 2.5; }
          if (e.pos.distanceTo(e.home) > e.roam) turnTo(e, e.home.x, e.home.z, damp(3, dt));
          if (!step(e, Math.sin(e.yaw) * K.speed * dt, Math.cos(e.yaw) * K.speed * dt)) e.yaw += 2;
          if (sees && e.t > 1) { e.state = 'alert'; e.t = 0; }
        } else if (e.state === 'alert') {
          turnTo(e, p.x, p.z, damp(12, dt));
          e.g.position.x = Math.sin(t * 50) * 0.04;
          if (Math.random() < dt * 12) puff(e.pos.clone().add(V3(-Math.sin(e.yaw) * 0.9, 0.1, -Math.cos(e.yaw) * 0.9)), 1, 0xd9c9b0, 1.5, 0.6);
          if (e.t > 0.8) { e.state = 'charge'; e.t = 0; e.g.position.x = 0; }
        } else if (e.state === 'charge') {
          const ok = step(e, Math.sin(e.yaw) * K.charge * dt, Math.cos(e.yaw) * K.charge * dt);
          if (!ok || e.t > 1.3 || e.pos.distanceTo(e.home) > e.roam + 12) {
            e.state = 'tired'; e.t = 0;
            if (!ok) puff(e.pos.clone().add(V3(0, 0.6, 0)), 8, 0xffe27a, 2.5, 1);
          }
        } else if (e.state === 'tired') {
          if (e.t > 1.4) { e.state = 'idle'; e.t = 0; }
        }
        const fast = e.state === 'charge' ? 28 : e.state === 'idle' ? 10 : 0;
        e.parts.legs.forEach((l, i) => (l.rotation.y = Math.sin(t * fast + i * 1.7) * 0.4));
      } else if (e.kind === 'gooier') {
        if (sees) {
          turnTo(e, p.x, p.z, damp(8, dt));
          e.fireT -= dt;
          e.parts.arm.rotation.x = e.fireT < 0.5 ? -2.2 * (1 - e.fireT / 0.5) : 0;
          e.parts.ball.visible = true;
          if (e.fireT <= 0) {
            e.fireT = 2.3;
            // lob it so it lands where you are now; keep moving and it misses
            const from = e.pos.clone().add(V3(Math.sin(e.yaw) * 0.4, 1.4, Math.cos(e.yaw) * 0.4));
            const T = 0.7 + dist * 0.045, to = p.clone().add(V3(0, 0.5, 0));
            const v = to.clone().sub(from).divideScalar(T); v.y = (to.y - from.y) / T + 0.5 * 22 * T;
            const m = new THREE.Mesh(snowGeo, e.o.ball ? toon(e.o.ball) : snowMat); addOutline(m, 1.1); m.position.copy(from); scene.add(m);
            shots.push({ m, v, life: 4 });
            e.parts.ball.visible = false;
          }
        } else { e.fireT = Math.max(e.fireT, 0.8); e.parts.arm.rotation.x *= 1 - damp(6, dt); }
        e.g.position.y = Math.abs(Math.sin(t * 3 + e.home.z)) * 0.08;
      } else if (e.kind === 'sporenblazer') {
        const c = e.parts.cap;
        if (e.state === 'idle') { c.scale.set(1, 0.75, 1); if (sees && e.t > 0.5) { e.state = 'alert'; e.t = 0; } }
        else if (e.state === 'alert') {
          // swelling up: your cue to get out of the way
          const k = Math.min(1, e.t / 0.8);
          c.scale.set(1 + k * 0.45, 0.75 + k * 0.35, 1 + k * 0.45);
          e.g.position.x = Math.sin(t * 60) * 0.03 * k;
          if (e.t > 0.8) {
            e.state = 'tired'; e.t = 0; e.g.position.x = 0;
            const m = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), sporeMat.clone());
            m.position.copy(e.pos).add(V3(0, 0.9, 0)); scene.add(m);
            clouds.push({ m, t: 0, hit: false });
            puff(m.position.clone(), 14, 0xb6e36b, 4, 1);
            if (api.spore) api.spore();
          }
        } else if (e.state === 'tired') { c.scale.y += (0.6 - c.scale.y) * damp(8, dt); c.scale.x += (0.9 - c.scale.x) * damp(8, dt); c.scale.z = c.scale.x; if (e.t > 2.4) { e.state = 'idle'; e.t = 0; } }
        turnTo(e, p.x, p.z, damp(3, dt));
      } else if (e.kind === 'springslak') {
        if (e.state === 'idle') {
          e.wander -= dt;
          if (e.wander <= 0) { e.wander = 2 + Math.random() * 3; e.yaw += (Math.random() - 0.5) * 3; }
          if (e.pos.distanceTo(e.home) > e.roam) turnTo(e, e.home.x, e.home.z, damp(3, dt));
          if (!step(e, Math.sin(e.yaw) * 0.7 * dt, Math.cos(e.yaw) * 0.7 * dt)) e.yaw += 2;
          if (sees && e.t > 0.8) { e.state = 'alert'; e.t = 0; }
        } else if (e.state === 'alert') {
          turnTo(e, p.x, p.z, damp(12, dt));
          e.g.scale.y = 1 - Math.min(1, e.t / 0.45) * 0.3;            // squash down before the hop
          if (e.t > 0.45) { e.state = 'hop'; e.t = 0; e.g.scale.y = 1; e.aim.set(Math.sin(e.yaw), 0, Math.cos(e.yaw)); }
        } else if (e.state === 'hop') {
          const k = Math.min(1, e.t / 0.65);
          step(e, e.aim.x * 6 * dt, e.aim.z * 6 * dt);
          e.g.position.y = Math.sin(k * Math.PI) * 1.7;
          if (k >= 1) { e.state = 'tired'; e.t = 0; e.g.position.y = 0; puff(e.pos.clone().add(V3(0, 0.1, 0)), 5, 0x7ad9c8, 2, 0.4); }
        } else if (e.state === 'tired') {
          if (e.t > 0.55) { e.state = sees && e.pos.distanceTo(e.home) < e.roam + 8 ? 'alert' : 'idle'; e.t = 0; }
        }
      } else if (e.kind === 'blikbot') {
        const { tipMat } = e.parts;
        if (e.state === 'idle') {
          e.wander -= dt;
          if (e.wander <= 0) { e.wander = 2 + Math.random() * 3; e.yaw += (Math.random() - 0.5) * 3; }
          if (e.pos.distanceTo(e.home) > e.roam) turnTo(e, e.home.x, e.home.z, damp(3, dt));
          if (!step(e, Math.sin(e.yaw) * K.speed * dt, Math.cos(e.yaw) * K.speed * dt)) e.yaw += 2;
          tipMat.color.setHex(0xffe14a);
          if (sees && e.t > 1) { e.state = 'alert'; e.t = 0; }
        } else if (e.state === 'alert') {
          // locks on and blinks faster and faster: then it fires
          turnTo(e, p.x, p.z, damp(10, dt));
          tipMat.color.setHex(Math.sin(e.t * (10 + e.t * 30)) > 0 ? 0xff3a3a : 0xffe14a);
          if (e.t > 0.9) {
            const from = e.pos.clone().add(V3(Math.sin(e.yaw) * 0.6, 0.75, Math.cos(e.yaw) * 0.6));
            const v = V3(p.x - from.x, 0, p.z - from.z).setLength(7.5);
            const m = new THREE.Mesh(boltGeo, boltMat); m.position.copy(from); scene.add(m);
            shots.push({ m, v, life: 3, grav: 0, color: 0xffe14a });
            e.state = 'tired'; e.t = 0;
          }
        } else if (e.state === 'tired') {
          if (e.t > 1.6) { e.state = sees ? 'alert' : 'idle'; e.t = 0; }
        }
      } else if (e.kind === 'gloeiworm') {
        const { segs, mound } = e.parts;
        mound.position.set(0, 0, 0);
        if (e.state === 'idle') {
          e.g.visible = false; e.hidden = true; mound.visible = true;
          mound.scale.set(1, 0.35 + Math.sin(t * 3 + e.home.x) * 0.05, 1);
          if (dist < K.see && e.t > 1.8 && Math.abs(p.y - e.pos.y) < 2) { e.state = 'alert'; e.t = 0; }
        } else if (e.state === 'alert') {
          mound.position.x = Math.sin(t * 50) * 0.06;
          if (Math.random() < dt * 14) puff(e.pos.clone().add(V3(0, 0.2, 0)), 1, 0xffc46b, 1.5, 1.2);
          if (e.t > 0.6) { e.state = 'up'; e.t = 0; e.g.visible = true; e.hidden = false; mound.visible = false; }
        } else if (e.state === 'up') {
          turnTo(e, p.x, p.z, damp(6, dt));
          e.g.position.y = -1.6 * (1 - Math.min(1, e.t / 0.22));
          segs.forEach((s, i) => (s.position.x = Math.sin(t * 6 + i) * 0.08 * i));
          if (e.t > 1.8) { e.state = 'tired'; e.t = 0; }
        } else if (e.state === 'tired') {
          e.g.position.y = -1.6 * Math.min(1, e.t / 0.3);
          if (e.t > 0.3) { e.state = 'idle'; e.t = 0; }
        }
      }
      if (!K.fly) e.pos.y = groundAt(e.pos.x, e.pos.z, 0);
      e.mark.visible = e.state === 'alert';
      e.root.position.copy(e.pos);
      e.root.rotation.y = e.yaw;
      if (e.hidden || (e.kind === 'gloeiworm' && e.state === 'tired' && e.t > 0.15)) continue;    // underground: can't be hit, can't hurt

      // stomp from above, or get hurt by touching it
      const top = e.pos.y + K.h + Math.max(0, e.g.position.y);
      const near = Math.hypot(p.x - e.pos.x, p.z - e.pos.z) < K.r + 0.45;
      if (near && P.vel.y < 0 && prevY >= top - 0.25 && p.y <= top + 0.5) {
        if (K.armored && P.pound !== 2 && P.ability !== 'zwaar') {
          api.bounce(10);
          api.toast('Au, wat een hard schild! Probeer een ground pound (Shift in de lucht)');
          e.state = 'tired'; e.t = 0;
        } else { kill(e, api); api.bounce(P.pound === 2 ? 12 : 14); }
      } else if (!invulnerable && Math.hypot(p.x - e.pos.x, p.z - e.pos.z) < K.r + 0.25 && p.y < top - 0.2 && p.y + 1.6 > e.pos.y + Math.max(0, e.g.position.y)) {
        api.damage(e.pos);
        if (e.kind === 'vleermuis') { e.state = 'rise'; e.t = 0; }
        if (e.kind === 'kruiper' || e.kind === 'kever') { e.state = 'tired'; e.t = 0; }
      }
      if (e.kind === 'kruiper' && e.state === 'tired' && e.t > 1.2) e.state = 'idle';
    }

    // spore clouds: they swell, linger a moment and fade
    for (let i = clouds.length - 1; i >= 0; i--) {
      const c = clouds[i];
      c.t += dt;
      const r = Math.min(2.3, 0.6 + c.t * 6);
      c.m.scale.setScalar(r); c.m.material.opacity = 0.5 * Math.max(0, 1 - c.t / 1.6);
      c.m.position.y += dt * 0.4;
      if (!c.hit && !invulnerable && c.t < 1.2 && c.m.position.distanceTo(chest) < r + 0.2) { c.hit = true; api.damage(c.m.position); }
      if (c.t > 1.6) { scene.remove(c.m); clouds.splice(i, 1); }
    }

    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      s.v.y -= (s.grav ?? 22) * dt; s.m.position.addScaledVector(s.v, dt); s.life -= dt;
      const q = s.m.position;
      let gone = s.life <= 0 || q.y < groundAt(q.x, q.z, 0) || blocked(q.x, q.z, q.y - 0.3, 0.2);
      if (!gone && !invulnerable && q.distanceTo(chest) < 0.85) { api.damage(q); gone = true; }
      if (gone) { puff(q.clone(), 8, s.color ?? 0xffffff, 2.5, 1); scene.remove(s.m); shots.splice(i, 1); }
    }
  }
  // a spark (or anything else) hitting an enemy
  function zap(q, r, api) {
    for (const e of list) {
      if (e.dead || e.hidden) continue;
      if (Math.hypot(q.x - e.pos.x, q.z - e.pos.z) < e.K.r + r && q.y > e.pos.y - 0.4 && q.y < e.pos.y + e.K.h + 0.6) { kill(e, api); return true; }
    }
    return false;
  }
  return { list, spawn, update, zap };
}
