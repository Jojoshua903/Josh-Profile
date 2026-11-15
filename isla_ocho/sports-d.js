import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const UP = V(0, 1, 0);

// ============ SWORDPLAY: SPEED SLICE ============
const FRUIT = {
  apple: { r: 0.12, skin: 0xe8403a, flesh: 0xfff1c9, pts: 10 },
  melon: { r: 0.2, skin: 0x3fa34d, flesh: 0xff5a6a, pts: 15 },
  coconut: { r: 0.15, skin: 0x7a4a2a, flesh: 0xffffff, pts: 20 },
  pear: { r: 0.14, skin: 0xc9d94a, flesh: 0xfff6d0, pts: 25 },
  bomb: { r: 0.16, skin: 0x26313a, flesh: 0xff6b4f, pts: -30 },
};
const sword = {
  id: 'sword', name: 'Speed Slice', emoji: '⚔️', blurb: '45 seconds of flying fruit in Adam’s dojo. Pears are worth the most.',
  how: 'Sweep the pointer fast through fruit to slice · avoid the black bombs',
  create(ctx) {
    const { root, mesh, hud, input, tex } = ctx;
    const SZ = -1.2;
    const deck = mesh(new THREE.BoxGeometry(7, 0.2, 5), 0xffffff, { mat: { map: tex.wood('#c58a4a', 10, [2, 1], 31) } }); deck.position.set(0, -0.1, -1); root.add(deck);
    const mat = mesh(new THREE.BoxGeometry(2.4, 0.03, 1.6), 0xe9dca8, { rough: 0.95 }); mat.position.set(0, 0.015, 0.6); root.add(mat);
    // segmented bamboo grove
    for (let i = 0; i < 12; i++) {
      const s = i < 6 ? -1 : 1, k = i % 6, h = 3 + (k % 3) * 0.5, x = s * (3 + (k % 3) * 0.3), z = -2.8 + Math.floor(k / 3) * 0.6;
      const bam = mesh(new THREE.CylinderGeometry(0.065, 0.075, h, 10), 0x8fc65a, { rough: 0.45 }); bam.position.set(x, h / 2, z); root.add(bam);
      for (let n = 1; n < h / 0.6; n++) { const node = mesh(new THREE.TorusGeometry(0.072, 0.012, 6, 14), 0x6da843); node.rotation.x = Math.PI / 2; node.position.set(x, n * 0.6, z); root.add(node); }
      const leaf = mesh(new THREE.ConeGeometry(0.25, 0.8, 4), 0x4fae62, { mat: { flatShading: true } }); leaf.position.set(x + s * 0.15, h, z); leaf.rotation.z = -s * 0.9; leaf.scale.z = 0.2; root.add(leaf);
    }
    // torii gate behind the slicing plane
    const torii = new THREE.Group(); torii.position.set(0, 0, -3.4); root.add(torii);
    for (const s of [-1, 1]) { const post = mesh(new THREE.CylinderGeometry(0.14, 0.17, 3.6, 14), 0xe8403a, { rough: 0.45 }); post.position.set(s * 2, 1.8, 0); torii.add(post); }
    const kasagi = mesh(new THREE.BoxGeometry(5.4, 0.28, 0.36), 0x26313a); kasagi.position.y = 3.75; torii.add(kasagi);
    const nuki = mesh(new THREE.BoxGeometry(4.6, 0.2, 0.22), 0xe8403a); nuki.position.y = 3.15; torii.add(nuki);
    const plaque = mesh(new THREE.BoxGeometry(0.7, 0.45, 0.06), 0xffffff, { mat: { map: tex.label('斬', '#26313a', '#ffc93c', 256, 160) } }); plaque.position.set(0, 3.45, 0.14); torii.add(plaque);
    // glowing paper lanterns
    for (const s of [-1, 1]) {
      const lan = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.45, 16), 0xff6b4f, { mat: { emissive: 0xff7a3a, emissiveIntensity: 1.1, transparent: true, opacity: 0.95 } }); lan.position.set(s * 2.4, 2.6, -2.2); root.add(lan);
      for (const y of [-0.24, 0.24]) { const cap = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.05, 12), 0x26313a); cap.position.set(s * 2.4, 2.6 + y, -2.2); root.add(cap); }
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.glow('255,150,90'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6 })); glow.scale.setScalar(1.6); glow.position.set(s * 2.4, 2.6, -2.15); root.add(glow);
    }
    ctx.setView(V(0, 1.55, 1.6), V(0, 1.3, SZ));
    const VR = ctx.vr;
    if (VR) { ctx.setView(V(0, 1.55, -0.3), V(0, 1.3, SZ)); ctx.laser(false); }
    const hilt = V();

    const blade = new THREE.Group();
    const bladeGeo = new THREE.BoxGeometry(0.035, 1, 0.008); bladeGeo.translate(0, 0.5, 0);
    const steel = mesh(bladeGeo, 0xf2f8fb, { metal: 0.95, rough: 0.12, mat: { envMapIntensity: 2, emissive: 0x2ac8e0, emissiveIntensity: 0.15 } }); blade.add(steel);
    const guard = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 16), 0xffc93c, { metal: 0.8, rough: 0.25 }); blade.add(guard);
    const grip = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 10), 0x123247); grip.position.y = -0.11; blade.add(grip);
    root.add(blade);
    const PIVOT = V(0.25, 0.75, 0.5);
    const N = 14, trail = [];
    const trailGeo = new THREE.BufferGeometry(); trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    const trailLine = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: 0x7fe9ff, transparent: true, opacity: 0.85 })); trailLine.frustumCulled = false; root.add(trailLine);

    const objs = [], bits = [];
    const tip = V(0, 1.3, SZ), prevTip = V(0, 1.3, SZ);
    let spawnT = 0.8, time = 45, score = 0, combo = 0, shake = 0, over = false;
    function spawn() {
      const n = Math.random() < 0.35 ? (Math.random() < 0.4 ? 3 : 2) : 1;
      for (let i = 0; i < n; i++) {
        const type = Math.random() < 0.15 ? 'bomb' : ['apple', 'melon', 'coconut', 'pear'][Math.floor(Math.random() * 4)];
        const F = FRUIT[type];
        const m = mesh(new THREE.SphereGeometry(F.r, 20, 14), F.skin, { rough: type === 'bomb' ? 0.3 : 0.5 });
        if (type === 'bomb') { const fuse = mesh(new THREE.SphereGeometry(0.04, 8, 6), 0xffc93c, { mat: { emissive: 0xff8a00, emissiveIntensity: 1 } }); fuse.position.y = F.r; m.add(fuse); }
        if (type === 'melon') m.scale.set(1, 0.85, 1);
        const x = rnd(-1.5, 1.5);
        const o = { m, type, F, p: V(x, -0.3, SZ), v: V(-x * rnd(0.3, 0.6), rnd(5.6, 6.8), 0), spin: V(rnd(-4, 4), rnd(-4, 4), rnd(-4, 4)) };
        root.add(m); objs.push(o);
      }
    }
    function burst(p, color, count, speed) {
      for (let i = 0; i < count; i++) {
        const b = mesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), color, { cast: false });
        b.position.copy(p); root.add(b);
        bits.push({ m: b, v: V(rnd(-1, 1), rnd(-0.5, 1.5), rnd(-1, 1)).multiplyScalar(speed), life: 0.8, spin: rnd(-10, 10) });
      }
    }
    function halves(o, dir) {
      const n = V(-dir.y, dir.x, 0).normalize();
      for (const s of [1, -1]) {
        const g = new THREE.Group();
        g.add(mesh(new THREE.SphereGeometry(o.F.r, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), o.F.skin));
        const face = mesh(new THREE.CircleGeometry(o.F.r * 0.95, 18), o.F.flesh, { mat: { side: THREE.DoubleSide } }); face.rotation.x = Math.PI / 2; g.add(face);
        g.position.copy(o.p); g.quaternion.setFromUnitVectors(UP, n.clone().multiplyScalar(s));
        root.add(g);
        bits.push({ m: g, v: o.v.clone().multiplyScalar(0.4).addScaledVector(n, s * 1.6), life: 1.4, spin: s * 5, half: true });
      }
    }
    function dispose(o) { root.remove(o.m); o.m.traverse((c) => { c.geometry?.dispose(); c.material?.dispose(); }); }
    function segDist(p, a, b) {
      const ab = b.clone().sub(a), t = clamp(p.clone().sub(a).dot(ab) / Math.max(ab.lengthSq(), 1e-6), 0, 1);
      return a.clone().addScaledVector(ab, t).distanceTo(p);
    }

    return {
      update(dt) {
        if (!over) {
          time -= dt;
          hud.info(`⏱ ${Math.max(0, time).toFixed(1)} s · fruit +10–20 · 🍐 +25 · combo bonus · bombs −30`);
          if (time <= 0) { over = true; ctx.finish(score, 'Slice faster for combos!'); }
        }
        prevTip.copy(tip);
        if (VR) {
          // the sword is the controller: a 95 cm blade pointing out of your hand
          const h = ctx.hand();
          hilt.copy(h.pos); tip.copy(h.pos).addScaledVector(h.dir, 0.95);
        } else {
          const hit = ctx.rayPlane(V(0, 0, 1), V(0, 0, SZ));
          if (hit) tip.set(clamp(hit.x, -2.4, 2.4), clamp(hit.y, 0.1, 3.2), SZ);
          hilt.copy(PIVOT);
        }
        const dirV = tip.clone().sub(hilt);
        blade.position.copy(hilt); blade.quaternion.setFromUnitVectors(UP, dirV.clone().normalize()); steel.scale.y = dirV.length();
        trail.unshift(tip.clone()); if (trail.length > N) trail.pop();
        const tp = trailGeo.attributes.position;
        for (let i = 0; i < N; i++) { const q = trail[Math.min(i, trail.length - 1)]; tp.setXYZ(i, q.x, q.y, q.z + 0.01); }
        tp.needsUpdate = true;
        const speed = tip.distanceTo(prevTip) / Math.max(dt, 1e-3);

        if (!over) { spawnT -= dt; if (spawnT <= 0) { spawn(); spawnT = rnd(0.55, 1.05) * (time > 20 ? 1 : 0.75); } }
        let slicedNow = 0;
        for (let i = objs.length - 1; i >= 0; i--) {
          const o = objs[i];
          o.v.y -= 6.5 * dt; o.p.addScaledVector(o.v, dt);
          o.m.position.copy(o.p); o.m.rotation.x += o.spin.x * dt; o.m.rotation.y += o.spin.y * dt;
          const near = Math.min(segDist(o.p, prevTip, tip), VR ? segDist(o.p, hilt, tip) : Infinity);
          if (speed > 2.2 && near < o.F.r + 0.05) {
            objs.splice(i, 1); dispose(o);
            ctx.buzz(o.type === 'bomb' ? 1 : 0.5, o.type === 'bomb' ? 200 : 40);
            if (o.type === 'bomb') {
              score = Math.max(0, score + o.F.pts); ctx.fx.sparks(o.p.clone()); ctx.fx.burst(o.p.clone(), { count: 24, colors: [0x26313a, 0x55606a, 0xff6b4f], speed: 3.5, up: 1.5, size: 0.06, life: 0.9 }); ctx.popup('−30', o.p.clone().add(V(0, 0.4, 0.2)), '#ff6b4f'); shake = 0.5;
              hud.toast('BOOM −30', 900); ctx.sfx('boom'); combo = 0;
            } else {
              halves(o, tip.clone().sub(prevTip).normalize()); ctx.fx.juice(o.p.clone(), o.F.flesh); ctx.fx.juice(o.p.clone(), o.F.skin); ctx.popup('+' + o.F.pts, o.p.clone().add(V(0, 0.35, 0.2)));
              score += o.F.pts; slicedNow++; ctx.sfx('slice');
            }
            continue;
          }
          if (o.p.y < -0.8 && o.v.y < 0) { objs.splice(i, 1); dispose(o); }
        }
        if (slicedNow > 1) { const bonus = (slicedNow - 1) * 10; score += bonus; hud.toast(`${slicedNow}× COMBO +${bonus}`, 800); ctx.sfx('score'); }
        if (slicedNow) hud.score(score);
        for (let i = bits.length - 1; i >= 0; i--) {
          const b = bits[i]; b.life -= dt;
          b.v.y -= 7 * dt; b.m.position.addScaledVector(b.v, dt); b.m.rotation.z += b.spin * dt;
          if (!b.half) b.m.scale.setScalar(Math.max(0.01, b.life / 0.8));
          if (b.life <= 0) { bits.splice(i, 1); dispose(b); }
        }
        if (shake > 0 && !VR) {
          shake -= dt;
          const s = Math.max(0, shake) * 0.1;
          ctx.setView(V(rnd(-1, 1) * s, 1.55 + rnd(-1, 1) * s, 1.6), V(0, 1.3, SZ));
        }
      },
    };
  },
};

// ============ POWER CRUISE (jet ski) ============
const cruise = {
  id: 'cruise', name: 'Power Cruise', emoji: '🚤', blurb: 'Rênas’s ring course. Each ring adds time to the clock.',
  how: 'Steer by pointing left/right (or A/D) · hold to boost · rings give +10 and +2.5 s',
  create(ctx) {
    const { root, mesh, hud, input } = ctx;
    const WY = -0.6, C = V(0, WY, 230);
    const boat = new THREE.Group();
    const hull = mesh(new THREE.BoxGeometry(0.95, 0.4, 2.1), 0xffffff, { rough: 0.15, mat: { envMapIntensity: 1.5 } }); boat.add(hull);
    const nose = mesh(new THREE.ConeGeometry(0.48, 0.9, 4), 0xffffff, { rough: 0.3 }); nose.rotation.set(-Math.PI / 2, Math.PI / 4, 0); nose.scale.set(1, 1, 0.42); nose.position.set(0, 0, -1.48); boat.add(nose);
    const stripe = mesh(new THREE.BoxGeometry(0.97, 0.1, 2.12), 0xff6b4f); stripe.position.y = -0.05; boat.add(stripe);
    const seat = mesh(new THREE.BoxGeometry(0.45, 0.15, 0.9), 0x123247); seat.position.set(0, 0.27, 0.25); boat.add(seat);
    const bar = mesh(new THREE.BoxGeometry(0.7, 0.05, 0.05), 0x123247); bar.position.set(0, 0.6, -0.45); boat.add(bar);
    const body = mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.62, 10), 0x13a9c2); body.position.set(0, 0.7, 0.1); body.rotation.x = -0.35; boat.add(body);
    const head = mesh(new THREE.SphereGeometry(0.15, 14, 10), 0xffc93c); head.position.set(0, 1.1, -0.05); boat.add(head);
    root.add(boat);
    const VR = ctx.vr;
    if (VR) { body.visible = false; head.visible = false; ctx.laser(false); }
    const arrow = mesh(new THREE.ConeGeometry(0.22, 0.7, 4), 0xffc93c, { mat: { emissive: 0xffa000, emissiveIntensity: 0.4 } });
    arrow.rotation.x = -Math.PI / 2; const arrowHolder = new THREE.Group(); arrowHolder.add(arrow); root.add(arrowHolder);

    const wake = [];
    for (let i = 0; i < 40; i++) { const w = mesh(new THREE.SphereGeometry(0.18, 8, 6), 0xffffff, { cast: false, mat: { transparent: true, opacity: 0.85 } }); w.visible = false; root.add(w); wake.push({ m: w, life: 0 }); }
    let wakeI = 0, wakeT = 0;

    const pos = V(0, WY, 82); let yaw = Math.PI, speed = 10, steer = 0, time = 60, score = 0, combo = 0, passed = 0, over = false, keyL = false, keyR = false;
    const rings = [];
    const fwd = (y) => V(-Math.sin(y), 0, -Math.cos(y));
    function makeRing(p, ry, i) {
      const g = new THREE.Group();
      const t = mesh(new THREE.TorusGeometry(2.4, 0.2, 10, 36), i % 2 ? 0xffc93c : 0xff6b4f, { mat: { emissive: i % 2 ? 0xffc93c : 0xff6b4f, emissiveIntensity: 0.25 } });
      g.add(t);
      const buoy = mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.6, 12), 0xffffff); buoy.position.y = -2.1; g.add(buoy);
      g.position.set(p.x, WY + 2.1, p.z); g.rotation.y = ry; root.add(g);
      return { g, p: V(p.x, WY, p.z), yaw: ry, done: false };
    }
    let ringCount = 0, lastP = pos.clone(), lastYaw = Math.PI;
    function addRing() {
      let y = lastYaw + rnd(-0.75, 0.75);
      const toC = C.clone().sub(lastP);
      if (toC.length() > 95) y = Math.atan2(-toC.x, -toC.z) + rnd(-0.35, 0.35);
      const p = lastP.clone().addScaledVector(fwd(y), rnd(26, 38));
      for (let k = 0; k < 8 && ctx.landY(p.x, p.z) > -2.5; k++) p.lerp(C, 0.35);
      rings.push(makeRing(p, y, ringCount++)); lastP = p; lastYaw = y;
    }
    for (let i = 0; i < 3; i++) addRing();
    const cam = pos.clone().add(V(0, 3.4, 8)), look = pos.clone();
    function removeRing(r) { root.remove(r.g); r.g.traverse((c) => { c.geometry?.dispose(); c.material?.dispose(); }); }

    return {
      onKey(k, down) {
        if (k === 'ArrowLeft' || k === 'a' || k === 'A') keyL = down;
        if (k === 'ArrowRight' || k === 'd' || k === 'D') keyR = down;
      },
      update(dt, t) {
        if (!over) {
          time -= dt;
          hud.info(`⏱ ${Math.max(0, time).toFixed(1)} s · combo ×${combo} · hold to boost`);
          if (time <= 0) { over = true; ctx.finish(score, `${passed} rings cleared.`); }
        }
        const f = fwd(yaw);
        let target = 0;
        if (keyL || keyR) target = (keyL ? 1 : 0) - (keyR ? 1 : 0);
        else if (VR && ctx.hands().every((h) => h.tracked)) {
          // handlebars: push one hand forward to turn the other way
          const [a, c] = ctx.hands().map((h) => h.local).sort((u, w) => u.x - w.x);
          target = clamp((a.z - c.z) / 0.22, -1, 1);
        } else {
          const d = ctx.aimYaw();
          const cross = f.z * d.x - f.x * d.z, dot = f.x * d.x + f.z * d.z;
          target = clamp(Math.atan2(cross, dot) / 0.45, -1, 1);
        }
        steer += (target - steer) * Math.min(1, dt * 6);
        const want = over ? 0 : input.down ? 23 : 13;
        speed += (want - speed) * Math.min(1, dt * 1.5);
        yaw += steer * 1.5 * dt * Math.min(1, speed / 8);
        pos.addScaledVector(fwd(yaw), speed * dt);
        const prevPos = pos.clone().addScaledVector(fwd(yaw), -speed * dt);
        if (ctx.landY(pos.x, pos.z) > -1.4) { pos.copy(prevPos); speed *= 0.4; yaw += 0.08; ctx.fx.splash(pos.clone().setY(WY + 0.1), 8); }
        const toC = pos.clone().sub(C); if (toC.length() > 210) pos.copy(C).addScaledVector(toC.normalize(), 210);

        const fw = fwd(yaw), hF = ctx.waveY(pos.x + fw.x, pos.z + fw.z), hB = ctx.waveY(pos.x - fw.x, pos.z - fw.z);
        boat.position.set(pos.x, WY + 0.16 + (hF + hB) / 2 + Math.sin(t * 5) * 0.03, pos.z);
        boat.rotation.set(-0.06 * (speed / 23) + Math.atan2(hF - hB, 2), yaw, -steer * 0.35, 'YXZ');

        // rings
        const first = rings[0];
        if (first) {
          const d = Math.hypot(pos.x - first.p.x, pos.z - first.p.z);
          const rf = fwd(first.yaw);
          const past = (pos.x - first.p.x) * rf.x + (pos.z - first.p.z) * rf.z;
          if (d < 2.7) {
            combo++; passed++; const pts = 10 * Math.min(combo, 5); score += pts; time += 2.5; hud.score(score);
            hud.toast(combo > 1 ? `+${pts} ×${Math.min(combo, 5)}` : '+10', 700); ctx.sfx('score');
            first.done = true; ctx.fx.burst(first.g.position.clone(), { count: 50, colors: [0xffc93c, 0xff6b4f, 0xffffff, 0x13a9c2], speed: 5, up: 1.5, size: 0.09, life: 1.1, gravity: 4 }); ctx.fx.splash(first.p.clone().setY(WY + 0.1), 30); rings.shift(); removeRing(first); addRing();
          } else if (past > 4 || d > 70) {
            combo = 0; hud.toast('Missed ring', 600); ctx.sfx('miss');
            rings.shift(); removeRing(first); addRing();
          }
          rings.forEach((rg, i) => { rg.g.children[0].rotation.z = t * (i ? 0.5 : 1.2); rg.g.position.y = WY + 2.1 + ctx.waveY(rg.p.x, rg.p.z); });
          const nx = rings[0];
          if (VR) arrowHolder.position.copy(pos).addScaledVector(f, 3).setY(WY + 1.4);
          else arrowHolder.position.set(pos.x, WY + 2.4, pos.z);
          arrowHolder.rotation.y = Math.atan2(-(nx.p.x - pos.x), -(nx.p.z - pos.z));
        }
        // wake
        wakeT -= dt;
        if (wakeT <= 0) {
          wakeT = 0.04;
          const w = wake[wakeI++ % wake.length]; w.life = 1; w.m.visible = true; if (speed > 15 && Math.random() < 0.5) ctx.fx.splash(pos.clone().addScaledVector(f, -1).setY(WY + 0.1), 3 + Math.round(Math.abs(steer) * 4));
          w.m.position.copy(pos).addScaledVector(f, -1.2).add(V(rnd(-0.3, 0.3), 0.05, 0));
        }
        wake.forEach((w) => { if (w.life > 0) { w.life -= dt; w.m.scale.setScalar(0.5 + (1 - w.life) * 2.2); w.m.material.opacity = Math.max(0, w.life) * 0.8; if (w.life <= 0) w.m.visible = false; } });

        const ff = fwd(yaw);
        const camT = pos.clone().addScaledVector(ff, -7.5).add(V(0, 3.3, 0));
        const lookT = pos.clone().addScaledVector(ff, 8).add(V(0, 0.8, 0));
        cam.lerp(camT, Math.min(1, dt * 4)); look.lerp(lookT, Math.min(1, dt * 5));
        if (VR) ctx.setView(pos.clone().addScaledVector(ff, 0.25), pos.clone().addScaledVector(ff, 10), WY + 0.3);
        else ctx.setView(cam, look);
      },
    };
  },
};

export const SPORTS_D = [sword, cruise];
