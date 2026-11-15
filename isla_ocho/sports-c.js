import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);

// ============ TABLE TENNIS ============
const tableTennis = {
  id: 'pingpong', name: 'Table Tennis', emoji: '🏓', blurb: 'First to 7 against Fionn. Swing fast to smash.',
  how: 'Move the pointer to place your paddle · swing through the ball · faster swing = harder shot',
  create(ctx) {
    const { root, mesh, hud, input, tex } = ctx;
    const TOP = 0.76, HW = 0.7625, HL = 1.37, R = 0.03, G = 9.8, PZ = 1.5, AZ = -1.5, NET = 0.1525;
    const floor = mesh(new THREE.PlaneGeometry(10, 12), 0xffffff, { cast: false, rough: 0.8, mat: { map: tex.tiles([7, 8]) } }); floor.rotation.x = -Math.PI / 2; floor.position.y = 0.01; root.add(floor);
    const top = mesh(new THREE.BoxGeometry(HW * 2, 0.04, HL * 2), 0x1478b0, { rough: 0.22, mat: { envMapIntensity: 1.2 } }); top.position.y = TOP - 0.02; root.add(top);
    const edge = mesh(new THREE.BoxGeometry(HW * 2 + 0.02, 0.03, HL * 2 + 0.02), 0x0d4f75); edge.position.y = TOP - 0.045; root.add(edge);
    const lines = [[HW * 2, 0.02, 0, HL - 0.01], [HW * 2, 0.02, 0, -HL + 0.01], [0.02, HL * 2, HW - 0.01, 0], [0.02, HL * 2, -HW + 0.01, 0], [0.006, HL * 2, 0, 0]];
    lines.forEach(([w, d, x, z]) => { const l = mesh(new THREE.PlaneGeometry(w, d), 0xffffff, { cast: false }); l.rotation.x = -Math.PI / 2; l.position.set(x, TOP + 0.001, z); root.add(l); });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const leg = mesh(new THREE.CylinderGeometry(0.03, 0.03, TOP, 10), 0x26313a, { metal: 0.7, rough: 0.3 }); leg.position.set(sx * (HW - 0.12), TOP / 2, sz * (HL - 0.2)); root.add(leg); }
    const net = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2 + 0.3, NET, 30, 4), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.75 })); net.position.set(0, TOP + NET / 2, 0); root.add(net);
    const tape = mesh(new THREE.BoxGeometry(HW * 2 + 0.3, 0.015, 0.012), 0xffffff); tape.position.set(0, TOP + NET, 0); root.add(tape);
    for (const s of [-1, 1]) { const post = mesh(new THREE.CylinderGeometry(0.012, 0.012, NET + 0.03, 8), 0x26313a, { metal: 0.7 }); post.position.set(s * (HW + 0.15), TOP + NET / 2, 0); root.add(post); }
    // patio dressing: striped umbrella, planters, string lights
    const umbPole = mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 8), 0xffffff); umbPole.position.set(-3, 1.3, -1); root.add(umbPole);
    const umb = mesh(new THREE.ConeGeometry(1.5, 0.6, 16), 0xffc93c, { mat: { flatShading: true } }); umb.position.set(-3, 2.7, -1); root.add(umb);
    for (const [x, z] of [[3.6, -2.5], [3.6, 1.5], [-3.6, 2.4]]) {
      const pot = mesh(new THREE.CylinderGeometry(0.35, 0.28, 0.6, 14), 0xc96b3c, { rough: 0.9 }); pot.position.set(x, 0.3, z); root.add(pot);
      const bush = mesh(new THREE.IcosahedronGeometry(0.5, 1), 0x3aa457, { mat: { flatShading: true } }); bush.position.set(x, 0.95, z); root.add(bush);
    }
    for (let k = 0; k < 14; k++) {
      const u = k / 13, x = -3.2 + u * 6.4, y = 3 - Math.sin(u * Math.PI) * 0.5;
      const bulb = mesh(new THREE.SphereGeometry(0.06, 8, 6), [0xffc93c, 0xff6b4f, 0x13a9c2, 0xffffff][k % 4], { cast: false, mat: { emissive: [0xffb020, 0xff5a3a, 0x2ac8e0, 0xffffff][k % 4], emissiveIntensity: 1.6 } });
      bulb.position.set(x, y, -2.8); root.add(bulb);
    }

    function paddle(color) {
      const g = new THREE.Group();
      const wood = mesh(new THREE.CylinderGeometry(0.087, 0.087, 0.008, 32), 0xd9a066, { rough: 0.6 }); wood.rotation.x = Math.PI / 2; g.add(wood);
      for (const s of [-1, 1]) { const rubber = mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.004, 32), s > 0 ? color : 0x1b2026, { rough: 0.85 }); rubber.rotation.x = Math.PI / 2; rubber.position.z = s * 0.006; g.add(rubber); }
      const handle = mesh(new THREE.CapsuleGeometry(0.016, 0.08, 4, 8), 0xc58a4a, { rough: 0.5 }); handle.position.y = -0.13; g.add(handle);
      root.add(g); return g;
    }
    const me = paddle(0xe8403a), cpu = paddle(0x6b3fa0);
    // Fionn plays the far end, sliding along with the paddle
    const toon = ctx.character({ name: ctx.host.name, ...ctx.host.look });
    toon.position.set(0, 0, -2.25); root.add(toon);
    const ball = mesh(new THREE.SphereGeometry(R, 20, 14), 0xff9a1f, { rough: 0.35, mat: { emissive: 0xff7a00, emissiveIntensity: 0.25 } }); root.add(ball);
    // motion trail so fast rallies stay readable
    const TN = 12, trailPts = Array.from({ length: TN }, () => V());
    const trailGeo = new THREE.BufferGeometry().setFromPoints(trailPts);
    const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: 0xffc93c, transparent: true, opacity: 0.55 })); trail.frustumCulled = false; root.add(trail);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.03, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 }));
    shadow.rotation.x = -Math.PI / 2; root.add(shadow);
    ctx.setView(V(0, 1.5, 2.75), V(0, 0.8, -0.5));
    const VR = ctx.vr;
    if (VR) { ctx.setView(V(0, 1.5, 2.15), V(0, 0.8, -0.5)); ctx.laser(false); }

    const p = V(), v = V(), meP = V(0, 1, PZ), meVel = V(), cpuP = V(0, 1, AZ);
    let state = 'serve', timer = 1, last = 'ai', bounces = 0, pp = 0, ap = 0, err = 0, rally = 0;
    function shoot(tx, tz, T) {
      const ty = TOP + R;
      for (let i = 0; i < 12; i++) {
        v.set((tx - p.x) / T, (ty - p.y + 0.5 * G * T * T) / T, (tz - p.z) / T);
        const tc = (0 - p.z) / v.z, yc = p.y + v.y * tc - 0.5 * G * tc * tc;
        if (yc > TOP + NET + R + 0.03) break;
        T += 0.05;
      }
    }
    function serve() {
      p.set(rnd(-0.4, 0.4), 1.0, AZ + 0.05); cpuP.set(p.x, p.y, AZ);
      shoot(rnd(-0.55, 0.55), rnd(0.6, 1.0), 0.85);
      last = 'ai'; bounces = 0; state = 'play'; rally = 0; err = rnd(-0.1, 0.1);
      ctx.sfx('hit');
    }
    function point(winner, why) {
      if (state !== 'play') return;
      if (winner === 'me') pp++; else ap++;
      hud.score(`${pp}–${ap}`, 'You–Fionn');
      hud.toast(winner === 'me' ? 'Point! ' + (why || '') : why || 'Fionn scores!', 1000);
      ctx.sfx(winner === 'me' ? 'score' : 'miss');
      state = 'point'; timer = 1.4;
      if ((pp >= 7 || ap >= 7) && Math.abs(pp - ap) >= 1) {
        state = 'over';
        ctx.finish(pp * 10 + (pp > ap ? 30 : 0), pp > ap ? `You won ${pp}–${ap}!` : `Fionn won ${ap}–${pp}.`, pp > ap);
      }
    }
    hud.score('0–0', 'You–Fionn');

    return {
      update(dt) {
        // player paddle follows the aim ray on a vertical plane
        const prev = meP.clone();
        if (VR) {
          // the paddle is the controller: position, angle and swing speed are all real
          const h = ctx.hand();
          meP.copy(h.pos).addScaledVector(h.dir, 0.07);
          meVel.copy(h.vel);
          me.position.copy(meP); me.quaternion.copy(h.quat);
        } else {
          const hit = ctx.rayPlane(V(0, 0, 1), V(0, 0, PZ));
          if (hit) meP.lerp(V(clamp(hit.x, -1.3, 1.3), clamp(hit.y, 0.8, 1.7), PZ), Math.min(1, dt * 22));
          meVel.lerp(meP.clone().sub(prev).divideScalar(Math.max(dt, 1e-3)), 0.35);
          me.position.copy(meP); me.rotation.z = clamp(-meVel.x * 0.08, -0.6, 0.6); me.rotation.x = clamp(meVel.y * 0.05, -0.4, 0.4);
        }

        if (state === 'serve' || state === 'point') {
          timer -= dt;
          if (state === 'point' && timer < 0.6) { p.set(cpuP.x, 1.0, AZ + 0.05); v.set(0, 0, 0); }
          if (timer <= 0) serve();
        }
        if (state === 'play') {
          const steps = 4, h = dt / steps;
          for (let i = 0; i < steps && state === 'play'; i++) {
            const prevP = p.clone();
            v.y -= G * h; v.multiplyScalar(1 - 0.05 * h); p.addScaledVector(v, h);
            if (p.y - R < TOP && prevP.y - R >= TOP && Math.abs(p.x) < HW && Math.abs(p.z) < HL) {
              p.y = TOP + R; v.y = -v.y * 0.88; ctx.sfx('hit');
              const side = p.z > 0 ? 'me' : 'ai';
              if (side === last) { point(side === 'me' ? 'ai' : 'me', 'Fault'); break; }
              bounces++; if (bounces >= 2) { point(last === 'me' ? 'me' : 'ai', 'Double bounce!'); break; }
            }
            if (Math.sign(prevP.z) !== Math.sign(p.z) && p.y < TOP + NET + R && Math.abs(p.x) < HW + 0.15) { v.z = -v.z * 0.2; v.x *= 0.3; p.z = prevP.z; ctx.sfx('thud'); }
            // player hit
            const meHit = VR ? p.distanceTo(meP) < 0.17 : p.z > PZ - 0.14 && p.z < PZ + 0.3 && Math.hypot(p.x - meP.x, p.y - meP.y) < 0.24;
            if (last === 'ai' && v.z > 0 && meHit) {
              const swing = clamp(meVel.length(), 0, 9);
              const tx = clamp(p.x * 0.3 + meVel.x * 0.16, -0.68, 0.68);
              const tz = -clamp(0.55 + swing * 0.08, 0.55, 1.25);
              p.z = Math.min(p.z, meP.z - 0.02);
              if (VR) ctx.buzz(0.4 + swing * 0.06, 40);
              shoot(tx, tz, clamp(0.9 - swing * 0.065, 0.36, 0.9));
              last = 'me'; bounces = 0; rally++;
              err = rnd(-1, 1) * clamp(0.05 + swing * 0.04 + rally * 0.01 - pp * 0.004, 0.05, 0.42);
              ctx.sfx('hit'); ctx.fx.burst(p.clone(), { count: 8 + Math.round(swing * 2), colors: [0xffc93c, 0xffffff], speed: 1.5 + swing * 0.3, up: 0.5, size: 0.02, life: 0.4, gravity: 3 }); if (swing > 5.5) { hud.toast('SMASH!', 600); ctx.shake(0.2); }
            }
            // cpu hit
            if (last === 'me' && v.z < 0 && p.z < AZ + 0.1 && p.z > AZ - 0.3 && Math.abs(p.x - cpuP.x) < 0.2 && Math.abs(p.y - cpuP.y) < 0.3) {
              p.z = Math.max(p.z, AZ + 0.02);
              shoot(rnd(-0.62, 0.62), rnd(0.5, 1.1), clamp(0.95 - pp * 0.05, 0.55, 0.95));
              last = 'ai'; bounces = 0; ctx.sfx('hit');
            }
            if (p.y < 0.08 || Math.abs(p.z) > 3.4 || Math.abs(p.x) > 2.6) {
              const hitterGotIn = bounces >= 1;
              point(hitterGotIn ? (last === 'me' ? 'me' : 'ai') : (last === 'me' ? 'ai' : 'me'), hitterGotIn ? '' : 'Out!');
            }
          }
          // cpu movement
          let tx = 0, ty = 1.0;
          if (v.z < 0 && last === 'me') { const tr = (p.z - AZ) / -v.z; tx = p.x + v.x * tr + err; ty = clamp(p.y + v.y * tr * 0.5, 0.85, 1.5); }
          const maxS = (2.1 + pp * 0.2) * dt;
          cpuP.x += clamp(tx - cpuP.x, -maxS, maxS); cpuP.y += clamp(ty - cpuP.y, -maxS, maxS);
        }
        cpu.position.copy(cpuP);
        toon.position.x += (cpuP.x * 0.9 + 0.25 - toon.position.x) * Math.min(1, dt * 8);
        ball.position.copy(p); trailPts.pop(); trailPts.unshift(p.clone()); { const tp = trailGeo.attributes.position; trailPts.forEach((q, i) => tp.setXYZ(i, q.x, q.y, q.z)); tp.needsUpdate = true; }
        const onTable = Math.abs(p.x) < HW && Math.abs(p.z) < HL;
        shadow.position.set(p.x, onTable ? TOP + 0.002 : 0.012, p.z);
      },
    };
  },
};

// ============ FRISBEE ============
const frisbee = {
  id: 'frisbee', name: 'Frisbee Toss', emoji: '🥏', blurb: 'Land the disc on Deniz’s targets and pop floating pears mid-flight.',
  how: 'Aim up a little · hold & release to throw · flick sideways as you let go to curve it',
  create(ctx) {
    const { root, mesh, hud, input } = ctx;
    const START = V(0, 1.35, 14);
    const mat = mesh(new THREE.CircleGeometry(1.1, 24), 0xffffff, { cast: false, mat: { map: ctx.tex.label('THROW', '#13a9c2', '#fff4dc', 512, 512) } }); mat.rotation.x = -Math.PI / 2; mat.position.set(0, 0.012, 14.5); root.add(mat);
    const tgt = new THREE.Group(); root.add(tgt);
    [[3.2, 0xff6b4f], [2, 0xffffff], [1, 0xffc93c]].forEach(([r, c], i) => {
      const ring = mesh(new THREE.CircleGeometry(r, 40), c, { cast: false }); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.012 + i * 0.002; tgt.add(ring);
    });
    const tPole = mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6), 0xffffff); tPole.position.y = 1.1; tgt.add(tPole);
    const tFlag = mesh(new THREE.PlaneGeometry(0.6, 0.4), 0xff6b4f, { mat: { side: THREE.DoubleSide } }); tFlag.position.set(0.3, 2, 0); tgt.add(tFlag);

    const disc = new THREE.Group();
    disc.add(mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.03, 28), 0xff4f8b, { rough: 0.2, mat: { envMapIntensity: 1.4 } }));
    const rimT = mesh(new THREE.TorusGeometry(0.13, 0.012, 6, 28), 0xffffff); rimT.rotation.x = Math.PI / 2; rimT.position.y = 0.015; disc.add(rimT);
    root.add(disc);
    const balloons = [];

    let throwN = 0, score = 0, state = 'aim', timer = 0, curve = 0, dist = 15;
    const VR = ctx.vr, REST = V(0.25, 1.05, 14.3);
    if (VR) ctx.laser(false);
    const p = V(), v = V(), cam = V(), look = V(), camT = V(0, 1.75, 16.4), lookT = V(0, 1.1, 0);
    cam.copy(camT); look.copy(lookT);
    function setup() {
      dist = 14 + throwN * 2 + rnd(0, 2);
      tgt.position.set(rnd(-7, 7), 0, START.z - dist);
      balloons.forEach((b) => { root.remove(b.g); b.g.traverse((n) => n.geometry?.dispose()); }); balloons.length = 0;
      for (let i = 0; i < 3; i++) {
        const g = new THREE.Group();
        // floating pears: pears are a WIDR running gag
        const pear = [0xc9d94a, 0xb5cf3a, 0xe0c84a][i];
        const s = mesh(new THREE.SphereGeometry(0.4, 16, 12), pear); g.add(s);
        const top = mesh(new THREE.SphereGeometry(0.26, 14, 10), pear); top.position.y = 0.42; g.add(top);
        const stem = mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.2, 6), 0x6b4423); stem.position.y = 0.75; stem.rotation.z = 0.3; g.add(stem);
        const leaf = mesh(new THREE.SphereGeometry(0.09, 8, 6), 0x3fa34d); leaf.scale.set(1.6, 0.4, 0.8); leaf.position.set(0.1, 0.78, 0); g.add(leaf);
        const k = rnd(0.3, 0.8);
        g.position.set(tgt.position.x * k + rnd(-3, 3), rnd(2.5, 5), START.z - dist * k);
        root.add(g); balloons.push({ g, alive: true, base: g.position.y, ph: rnd(0, 6) });
      }
      p.copy(START); v.set(0, 0, 0); disc.position.copy(p); disc.rotation.set(0.2, 0, 0); state = 'aim';
      camT.set(0, 1.75, 16.4); lookT.set(tgt.position.x * 0.3, 1.1, tgt.position.z * 0.3 + 4);
      hud.info(`Throw ${throwN + 1}/8 · target ${dist.toFixed(0)} m · floating pears +25`);
    }
    function land() {
      const d = Math.hypot(p.x - tgt.position.x, p.z - tgt.position.z);
      const pts = d < 1 ? 100 : d < 2 ? 50 : d < 3.2 ? 20 : 0;
      score += pts; hud.score(score);
      hud.toast(pts === 100 ? 'BULLSEYE! +100' : pts ? '+' + pts : 'Off target', 1000); if (pts) ctx.popup('+' + pts, p.clone().add(V(0, 1, 0))); if (pts === 100) ctx.fx.confetti(tgt.position.clone().setY(1.5), 150);
      ctx.sfx(pts === 100 ? 'cheer' : pts ? 'score' : 'miss');
      state = 'wait'; timer = 1.6;
    }
    setup();

    return {
      onRelease() {
        if (state !== 'aim') return;
        if (VR) {
          // real throw; tilting the wrist (disc angle) makes it curve
          const h = ctx.hand();
          if (h.vel.length() < 3) { hud.toast('Throw it!', 700); return; }
          p.copy(h.pos); v.copy(h.vel).multiplyScalar(1.6); if (v.length() > 26) v.setLength(26);
          const right = V(1, 0, 0).applyQuaternion(h.quat);
          curve = clamp(-right.y * 6, -5, 5);
          state = 'fly'; ctx.buzz(0.5, 50); ctx.sfx('whoosh');
          return;
        }
        const pw = input.lastCharge; if (pw < 0.05) return;
        const f = ctx.aimYaw();
        const e = clamp(Math.asin(clamp(input.ray.direction.y, -1, 1)) + 0.12, 0.04, 0.55);
        const sp = 9 + pw * 16;
        v.set(f.x * Math.cos(e) * sp, Math.sin(e) * sp, f.z * Math.cos(e) * sp);
        curve = ctx.vr ? 0 : clamp(input.ndcVel.x * 1.6, -5, 5);
        state = 'fly'; hud.power(null); ctx.sfx('whoosh');
      },
      update(dt, t) {
        tFlag.rotation.y = Math.sin(t * 3) * 0.4;
        balloons.forEach((b) => { if (b.alive) b.g.position.y = b.base + Math.sin(t * 1.5 + b.ph) * 0.25; });
        if (state === 'aim' && VR) {
          if (input.down) { const h = ctx.hand(); disc.position.copy(h.pos); disc.quaternion.copy(h.quat); }
          else { disc.position.copy(REST); disc.rotation.set(0.2, 0, 0); }
        } else if (state === 'aim') hud.power(input.down ? input.charge() : null);
        if (state === 'fly' || state === 'slide') {
          const sp = v.length();
          if (state === 'fly') {
            const gEff = 9.8 * (1 - 0.72 * Math.min(1, sp / 14));
            v.y -= gEff * dt;
            const hx = v.x, hz = v.z, hl = Math.hypot(hx, hz) || 1;
            v.x += (-hz / hl) * curve * dt; v.z += (hx / hl) * curve * dt;
            v.multiplyScalar(Math.exp(-0.12 * dt));
            p.addScaledVector(v, dt);
            disc.rotation.y += dt * 25; disc.rotation.z = clamp(-curve * 0.06, -0.4, 0.4);
            balloons.forEach((b) => {
              if (b.alive && b.g.position.distanceTo(p) < 0.6) { b.alive = false; b.g.visible = false; score += 25; hud.score(score); hud.toast('PEAR! +25', 700); ctx.sfx('pop'); ctx.fx.juice(b.g.position.clone(), 0xc9d94a); ctx.fx.juice(b.g.position.clone(), 0xfff6d0); ctx.popup('+25', b.g.position.clone().add(V(0, 0.8, 0)), '#c9d94a'); }
            });
            if (p.y <= 0.03) { p.y = 0.03; v.y = 0; state = 'slide'; ctx.sfx('thud'); ctx.fx.dust(p.clone(), 18); }
          } else {
            const hs = Math.hypot(v.x, v.z);
            if (hs < 0.1) land(); else { const k = Math.max(0, hs - 9 * dt) / hs; v.x *= k; v.z *= k; p.addScaledVector(v, dt); disc.rotation.y += dt * hs * 3; }
          }
          disc.position.copy(p);
          camT.set(p.x, Math.max(2.2, p.y + 2.4), p.z + 6); lookT.copy(p);
          if (Math.abs(p.x) > 60 || p.z < -60) land();
        } else if (state === 'wait') {
          timer -= dt;
          if (timer <= 0) { throwN++; if (throwN >= 8) { state = 'over'; ctx.finish(score, 'Max is 1,400.'); } else setup(); }
        }
        cam.lerp(camT, Math.min(1, dt * 3)); look.lerp(lookT, Math.min(1, dt * 3.5));
        if (VR) ctx.setView(V(0, 1.7, 14.7), tgt.position); else ctx.setView(cam, look);
      },
    };
  },
};

export const SPORTS_C = [tableTennis, frisbee];
