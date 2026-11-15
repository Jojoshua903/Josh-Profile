import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const isLeft = (k) => k === 'ArrowLeft' || k === 'a' || k === 'A';
const isRight = (k) => k === 'ArrowRight' || k === 'd' || k === 'D';

// ============ BOWLING ============
const bowling = {
  id: 'bowling', name: 'Bowling', emoji: '🎳', blurb: 'Five frames on the beach lanes. Strikes score double.',
  how: '←/→ shift your stance · aim at the pins · hold & release to roll',
  create(ctx) {
    const { root, mesh, hud, input, tex } = ctx;
    const LEN = 18, W = 1.06, BR = 0.11, PR = 0.06, PINZ = -LEN + 0.4, LZ = -LEN / 2 + 0.25;
    const deck = mesh(new THREE.BoxGeometry(4.4, 0.3, LEN + 7), 0xffffff, { mat: { map: tex.wood('#7a4f31', 8, [1, 5], 21) } }); deck.position.set(0, -0.16, -LEN / 2 + 1); root.add(deck);
    // glossy maple lane that reflects the sky
    const lane = mesh(new THREE.BoxGeometry(W, 0.05, LEN + 1.5), 0xffffff, { rough: 0.12, mat: { map: tex.wood('#eebd80', 12, [1, 6], 4), envMapIntensity: 1.3 } }); lane.position.set(0, -0.025, LZ); root.add(lane);
    for (const s of [-1, 1]) {
      const gut = mesh(new THREE.CylinderGeometry(0.12, 0.12, LEN + 1.5, 16, 1, true, -Math.PI / 2, Math.PI), 0xc5d0d6, { metal: 0.85, rough: 0.25, mat: { side: THREE.DoubleSide } });
      gut.rotation.x = Math.PI / 2; gut.position.set(s * (W / 2 + 0.12), 0.0, LZ); root.add(gut);
      const rail = mesh(new THREE.BoxGeometry(0.14, 0.24, LEN + 1.5), 0xff6b4f, { rough: 0.35 }); rail.position.set(s * (W / 2 + 0.31), 0.05, LZ); root.add(rail);
      const glow = mesh(new THREE.BoxGeometry(0.03, 0.03, LEN + 1.5), 0xffc93c, { cast: false, mat: { emissive: 0xffb020, emissiveIntensity: 1.4 } }); glow.position.set(s * (W / 2 + 0.24), 0.17, LZ); root.add(glow);
    }
    for (let i = -3; i <= 3; i++) {
      const dot = mesh(new THREE.CircleGeometry(0.03, 3), 0x8a3a1b, { cast: false });
      dot.rotation.x = -Math.PI / 2; dot.rotation.z = Math.PI / 2; dot.position.set(i * 0.13, 0.002, -4.5 + Math.abs(i) * 0.3); root.add(dot);
    }
    const foul = mesh(new THREE.PlaneGeometry(W, 0.04), 0x123247, { cast: false }); foul.rotation.x = -Math.PI / 2; foul.position.set(0, 0.002, -0.35); root.add(foul);
    const back = mesh(new THREE.BoxGeometry(3.2, 1.6, 0.3), 0x123247); back.position.set(0, 0.6, -LEN - 1.1); root.add(back);
    const pit = mesh(new THREE.BoxGeometry(W + 0.5, 0.5, 0.02), 0x0b1a26, { cast: false }); pit.position.set(0, 0.25, -LEN - 0.94); root.add(pit);
    const sign = mesh(new THREE.BoxGeometry(3.2, 0.6, 0.12), 0xffffff, { mat: { map: tex.label('WIDR LANES'), emissive: 0xffffff, emissiveIntensity: 0.25, emissiveMap: tex.label('WIDR LANES') } }); sign.position.set(0, 1.75, -LEN - 0.4); root.add(sign);
    for (const s of [-1, 1]) { const post = mesh(new THREE.CylinderGeometry(0.06, 0.06, 2, 8), 0xffffff, { metal: 0.6, rough: 0.3 }); post.position.set(s * 1.5, 0.9, -LEN - 0.4); root.add(post); }
    for (let k = 0; k < 6; k++) { const bulb = mesh(new THREE.SphereGeometry(0.05, 8, 6), 0xfff3b0, { cast: false, mat: { emissive: 0xffd060, emissiveIntensity: 2 } }); bulb.position.set(-1.25 + k * 0.5, 2.1, -LEN - 0.38); root.add(bulb); }

    const pinGeo = new THREE.LatheGeometry([[0, 0], [0.03, 0], [0.052, 0.05], [0.06, 0.11], [0.048, 0.19], [0.024, 0.25], [0.029, 0.31], [0.022, 0.365], [0, 0.38]].map((p) => new THREE.Vector2(p[0], p[1])), 24);
    const pins = [];
    for (let r = 0; r < 4; r++) for (let i = 0; i <= r; i++) {
      const g = new THREE.Group();
      const body = mesh(pinGeo, 0xffffff, { rough: 0.12, mat: { envMapIntensity: 1.2 } });
      for (const y of [0.262, 0.288]) { const stripe = mesh(new THREE.TorusGeometry(y === 0.262 ? 0.027 : 0.03, 0.006, 6, 20), 0xe8403a, { rough: 0.2 }); stripe.rotation.x = Math.PI / 2; stripe.position.y = y; g.add(stripe); }
      g.add(body); root.add(g);
      pins.push({ g, hx: (i - r / 2) * 0.305, hz: PINZ - r * 0.264, x: 0, z: 0, vx: 0, vz: 0, tilt: 0, fall: 0, hit: false, down: false, gone: false, dir: { x: 0, z: -1 }, axis: V(-1, 0, 0) });
    }
    const ball = mesh(new THREE.SphereGeometry(BR, 32, 22), 0x13a9c2, { rough: 0.06, metal: 0.35, mat: { envMapIntensity: 1.5 } });
    const swirl = mesh(new THREE.TorusGeometry(BR * 0.985, 0.014, 8, 32), 0xffc93c, { rough: 0.1, metal: 0.3 }); swirl.rotation.y = Math.PI / 2; ball.add(swirl);
    [[0, 0.03], [-0.025, -0.01], [0.025, -0.01]].forEach(([x, y]) => { const hole = mesh(new THREE.CircleGeometry(0.012, 10), 0x0b1a26, { cast: false }); hole.position.set(x, y, BR * 0.995); ball.add(hole); });
    root.add(ball);
    const aimGeo = new THREE.BufferGeometry().setFromPoints([V(0, 0.02, 0), V(0, 0.02, -6)]);
    const aimLine = new THREE.Line(aimGeo, new THREE.LineBasicMaterial({ color: 0xff6b4f }));
    root.add(aimLine);

    ctx.setView(V(0, 1.45, 1.9), V(0, 0.1, -LEN * 0.55));
    const VR = ctx.vr, REST = V(0.42, 0.95, 1.35);
    if (VR) {
      ctx.setView(V(0, 1.45, 1.7), V(0, 0.1, -LEN * 0.55));
      ctx.laser(false);
      const ped = mesh(new THREE.CylinderGeometry(0.12, 0.16, REST.y - BR, 12), 0xffc93c); ped.position.set(REST.x, (REST.y - BR) / 2, REST.z); root.add(ped);
    }
    const b = { x: 0, y: BR, z: 0.2, vx: 0, vy: 0, vz: 0, gutter: false };
    let state = 'aim', frame = 1, roll = 1, score = 0, timer = 0, firstRoll = 0, rollT = 0, lastClack = 0;
    let dir = V(0, 0, -1);

    const center = (p) => { const s = Math.sin(p.tilt) * 0.19; return { x: p.x + p.dir.x * s, z: p.z + p.dir.z * s }; };
    const place = (p) => {
      p.g.position.set(p.x, p.fall, p.z);
      if (p.tilt > 0) p.g.quaternion.setFromAxisAngle(p.axis, p.tilt); else p.g.quaternion.identity();
    };
    const setHit = (p) => {
      if (p.hit) return;
      p.hit = true;
      const s = Math.hypot(p.vx, p.vz) || 1;
      p.dir = { x: p.vx / s, z: p.vz / s };
      p.axis = V(p.dir.z, 0, -p.dir.x).normalize();
      const now = performance.now(); if (now - lastClack > 40) { ctx.sfx('hit'); lastClack = now; }
      ctx.fx.burst(V(p.x, 0.22, p.z), { count: 7, colors: [0xffffff, 0xe8403a, 0xffc93c], speed: 1.8, up: 1.2, size: 0.03, life: 0.6 });
      if (Math.hypot(p.vx, p.vz) > 3) ctx.shake(0.15);
    };
    function resetPins() { pins.forEach((p) => { Object.assign(p, { x: p.hx, z: p.hz, vx: 0, vz: 0, tilt: 0, fall: 0, hit: false, down: false, gone: false }); p.g.visible = true; place(p); }); }
    function clearDowned() {
      pins.forEach((p) => {
        if (p.down || p.tilt > 0.5) { p.gone = true; p.g.visible = false; }
        else { p.vx = p.vz = 0; p.tilt = 0; p.hit = false; place(p); }
      });
    }
    function resetBall() { Object.assign(b, { x: 0, y: BR, z: 0.2, vx: 0, vy: 0, vz: 0, gutter: false }); ball.position.set(0, BR, 0.2); ball.visible = true; state = 'aim'; aimLine.visible = !VR; }
    function info() { hud.info(VR ? `Frame ${frame}/5 · Roll ${roll} · trigger to grab, swing & let go` : `Frame ${frame}/5 · Roll ${roll} · ←/→ shift · hold & release`); }
    function evaluate() {
      const knocked = pins.filter((p) => !p.gone && (p.down || p.tilt > 0.5)).length;
      if (roll === 1) {
        if (knocked === 10) { score += 20; hud.toast('STRIKE!'); ctx.sfx('cheer'); ctx.fx.confetti(V(0, 1.2, PINZ - 0.3), 160); return nextFrame(); }
        firstRoll = knocked; score += knocked;
        hud.toast(knocked ? knocked + (knocked === 1 ? ' pin' : ' pins') : 'Gutter!'); ctx.sfx(knocked ? 'score' : 'miss');
        roll = 2; clearDowned(); resetBall(); info();
      } else {
        score += knocked;
        if (firstRoll + knocked === 10) { score += 5; hud.toast('SPARE!'); ctx.sfx('cheer'); }
        else { hud.toast(knocked + ' more'); ctx.sfx('score'); }
        nextFrame();
      }
      hud.score(score);
    }
    function nextFrame() {
      hud.score(score);
      frame++;
      if (frame > 5) { frame = 5; ctx.finish(score, 'Max is 100.'); return; }
      roll = 1; resetPins(); resetBall(); info();
    }
    function updatePins(dt) {
      for (const p of pins) {
        if (p.gone) continue;
        p.x += p.vx * dt; p.z += p.vz * dt;
        const k = Math.exp(-2.4 * dt); p.vx *= k; p.vz *= k;
        if (p.hit && p.tilt < Math.PI / 2) { p.tilt = Math.min(Math.PI / 2, p.tilt + dt * (5 + Math.hypot(p.vx, p.vz) * 2)); if (p.tilt >= Math.PI / 2) p.down = true; }
        if (Math.abs(p.x) > W / 2 + 0.05 || p.z < -LEN - 0.4) { p.down = true; p.hit = true; p.fall = Math.max(p.fall - dt * 2, -0.35); }
        place(p);
      }
      for (let i = 0; i < pins.length; i++) for (let j = i + 1; j < pins.length; j++) {
        const a = pins[i], c = pins[j];
        if (a.gone || c.gone || (!a.hit && !c.hit)) continue;
        const ca = center(a), cc = center(c);
        const dx = cc.x - ca.x, dz = cc.z - ca.z, d = Math.hypot(dx, dz);
        if (d < 0.14 && d > 1e-4) {
          const nx = dx / d, nz = dz / d;
          const rel = (a.vx - c.vx) * nx + (a.vz - c.vz) * nz;
          if (rel > 0) {
            const jj = rel * 0.95;
            a.vx -= nx * jj; a.vz -= nz * jj; c.vx += nx * jj; c.vz += nz * jj;
            if (jj > 0.12) { setHit(a); setHit(c); }
          }
        }
      }
    }
    resetPins(); resetBall(); info();

    return {
      onKey(k, down) {
        if (!down || state !== 'aim') return;
        if (isLeft(k)) b.x = clamp(b.x - 0.08, -0.42, 0.42);
        if (isRight(k)) b.x = clamp(b.x + 0.08, -0.42, 0.42);
      },
      onRelease() {
        if (state !== 'aim') return;
        if (VR) {
          // real throw: the ball leaves the hand with the controller's velocity
          const h = ctx.hand();
          const sp = Math.hypot(h.vel.x, h.vel.z);
          if (h.vel.z > -1 || sp < 1.2) { hud.toast('Swing forward!', 800); ctx.buzz(0.2, 60); return; }
          const speed = clamp(sp * 1.7, 3, 11.5);
          dir.set(h.vel.x, 0, h.vel.z).normalize();
          dir.x = clamp(dir.x / -dir.z, -0.08, 0.08); dir.z = -1; dir.normalize();
          b.x = clamp(h.pos.x, -0.45, 0.45); b.z = Math.min(h.pos.z, 1.2); b.y = Math.max(BR, h.pos.y); b.vy = Math.min(0, h.vel.y);
          b.vx = dir.x * speed; b.vz = dir.z * speed;
          state = 'roll'; rollT = 0; ctx.buzz(0.6, 70);
          return;
        }
        const p = input.lastCharge;
        if (p < 0.08) { hud.toast('Hold longer!', 700); return; }
        const speed = 4 + p * 6.5;
        b.vx = dir.x * speed; b.vz = dir.z * speed;
        state = 'roll'; rollT = 0; aimLine.visible = false; hud.power(null); ctx.sfx('thud');
      },
      update(dt) {
        if (state === 'aim' && VR) {
          if (input.down) ball.position.copy(ctx.hand().pos);
          else ball.position.copy(REST);
        } else if (state === 'aim') {
          const hit = ctx.rayGround(0);
          let tx = b.x, tz = -LEN;
          if (hit && hit.z < b.z - 1) { tx = hit.x; tz = hit.z; }
          dir.set(tx - b.x, 0, tz - b.z).normalize();
          dir.x = clamp(dir.x / -dir.z, -0.05, 0.05); dir.z = -1; dir.normalize();
          ball.position.set(b.x, BR, b.z);
          const pos = aimGeo.attributes.position;
          pos.setXYZ(0, b.x, 0.02, b.z - 0.15); pos.setXYZ(1, b.x + dir.x * 7, 0.02, b.z + dir.z * 7); pos.needsUpdate = true;
          hud.power(input.down ? input.charge() : null);
        } else if (state === 'roll') {
          rollT += dt;
          b.x += b.vx * dt; b.z += b.vz * dt;
          if (b.y > BR || b.vy < 0) {
            b.vy -= 9.8 * dt; b.y += b.vy * dt;
            if (b.y <= BR) { if (b.vy < -1.5) { ctx.sfx('thud'); ctx.buzz(0.4, 50); } b.y = BR; b.vy = 0; }
          }
          if (!b.gutter && Math.abs(b.x) > W / 2) { b.gutter = true; b.vx = 0; b.x = Math.sign(b.x) * (W / 2 + 0.12); ctx.sfx('thud'); }
          if (!b.gutter && b.z < PINZ + 0.5) {
            for (const p of pins) {
              if (p.gone) continue;
              const c = center(p); const dx = c.x - b.x, dz = c.z - b.z, d = Math.hypot(dx, dz);
              if (d < BR + PR + 0.01 && d > 1e-4) {
                const nx = dx / d, nz = dz / d;
                const vn = (b.vx - p.vx) * nx + (b.vz - p.vz) * nz;
                if (vn > 0) {
                  const side = (Math.random() - 0.5) * 0.4;
                  p.vx += nx * vn * 1.45 - nz * side; p.vz += nz * vn * 1.45 + nx * side;
                  b.vx -= nx * vn * 0.28; b.vz -= nz * vn * 0.28;
                  setHit(p);
                }
              }
            }
          }
          ball.position.set(b.x, b.gutter ? BR - 0.07 : b.y, b.z);
          ball.rotation.x -= (Math.hypot(b.vx, b.vz) * dt) / BR;
          if (b.z < -LEN - 0.6 || rollT > 7) { ball.visible = false; state = 'settle'; timer = 1.6; }
          updatePins(dt);
        } else if (state === 'settle') {
          updatePins(dt);
          timer -= dt;
          if (timer <= 0) { state = 'wait'; evaluate(); }
        }
      },
    };
  },
};

// ============ ARCHERY ============
const archery = {
  id: 'archery', name: 'Archery', emoji: '🏹', blurb: 'Eight arrows, gusting sea breeze, and targets that start to move.',
  how: 'Aim with the reticle · hold to draw · release to loose. Arrows drop & drift with wind.',
  create(ctx) {
    const { root, mesh, hud, input, camera, tex } = ctx;
    const grass = mesh(new THREE.PlaneGeometry(12, 46), 0xffffff, { cast: false, rough: 0.95, mat: { map: tex.grass(10, [1, 4]) } }); grass.rotation.x = -Math.PI / 2; grass.position.set(0, 0.01, -20); root.add(grass);
    for (let d = 10; d <= 35; d += 5) {
      const ln = mesh(new THREE.PlaneGeometry(12, 0.06), 0xffffff, { cast: false }); ln.rotation.x = -Math.PI / 2; ln.position.set(0, 0.015, -d); root.add(ln);
    }
    const mat = mesh(new THREE.BoxGeometry(2, 0.08, 1.2), 0xffffff, { mat: { map: tex.wood('#b57a45', 6) } }); mat.position.set(0, 0.04, 0.2); root.add(mat);
    // bunting strung between poles down both sides of the range
    for (const s of [-1, 1]) for (let k = 0; k < 7; k++) {
      const pole = mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.6, 6), 0xffffff); pole.position.set(s * 5.8, 1.3, -4 - k * 6); root.add(pole);
      if (k < 6) for (let f = 0; f < 8; f++) {
        const u = (f + 0.5) / 8, flag = mesh(new THREE.ConeGeometry(0.14, 0.32, 3), [0xffc93c, 0xff6b4f, 0x13a9c2, 0xffffff][f % 4]);
        flag.position.set(s * 5.8, 2.45 - Math.sin(u * Math.PI) * 0.45, -4 - k * 6 - u * 6); flag.rotation.set(0, Math.PI / 2, Math.PI); flag.scale.z = 0.2; root.add(flag);
      }
    }
    const hay = tex.straw();
    for (const [x, z] of [[-4, -8], [4.2, -14], [-4.4, -22], [4, -30]]) { const bale = mesh(new THREE.BoxGeometry(1.2, 0.6, 0.7), 0xffffff, { mat: { map: hay } }); bale.position.set(x, 0.3, z); bale.rotation.y = x; root.add(bale); }

    const T = new THREE.Group(); root.add(T);
    const straw = mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.25, 36), 0xffffff, { rough: 1, mat: { map: tex.straw() } }); straw.rotation.x = Math.PI / 2; T.add(straw);
    const colors = [0xffffff, 0xffffff, 0x26313a, 0x26313a, 0x2a8fd6, 0x2a8fd6, 0xe8403a, 0xe8403a, 0xffd23f, 0xffd23f];
    colors.forEach((c, k) => {
      const ring = mesh(new THREE.CircleGeometry(0.6 - k * 0.06, 48), c, { cast: false, rough: 0.7 });
      ring.position.z = 0.126 + k * 0.0012; T.add(ring);
      const edge = mesh(new THREE.RingGeometry(0.6 - k * 0.06 - 0.004, 0.6 - k * 0.06, 48), 0x123247, { cast: false }); edge.position.z = 0.1262 + k * 0.0012; T.add(edge);
    });
    const x = mesh(new THREE.CircleGeometry(0.012, 12), 0x123247, { cast: false }); x.position.z = 0.14; T.add(x);
    for (const s of [-1, 1]) {
      const leg = mesh(new THREE.BoxGeometry(0.08, 1.9, 0.08), 0xffffff, { mat: { map: tex.wood('#8a5a2b', 2) } }); leg.position.set(s * 0.45, -0.75, -0.25); leg.rotation.x = -0.2; T.add(leg);
    }

    // bow held in front of the camera
    const bowOuter = new THREE.Group(); const bowInner = new THREE.Group();
    bowOuter.add(bowInner); bowInner.rotation.z = -Math.PI / 2; bowOuter.rotation.y = Math.PI / 2;
    const limb = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.014, 6, 28, Math.PI), new THREE.MeshStandardMaterial({ color: 0x7a3e1d, roughness: 0.5 }));
    bowInner.add(limb);
    const strGeo = new THREE.BufferGeometry().setFromPoints([V(0.32, 0, 0), V(0, 0, 0), V(-0.32, 0, 0)]);
    bowInner.add(new THREE.Line(strGeo, new THREE.LineBasicMaterial({ color: 0xffffff })));
    bowOuter.position.set(0.16, -0.18, -0.55);
    const VR = ctx.vr;
    let nock = null;
    if (!VR) ctx.attachToCamera(bowOuter);
    else {
      // bow lives in the off hand; the trigger hand pulls the string
      ctx.laser(false);
      bowOuter.position.set(0, 0, -0.04);
      ctx.offHand().obj.add(bowOuter);
    }

    function makeArrow() {
      const g = new THREE.Group();
      const shaft = mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.75, 6), 0xf4e1b8); shaft.rotation.x = Math.PI / 2; g.add(shaft);
      const tip = mesh(new THREE.ConeGeometry(0.018, 0.07, 6), 0x55606a, { metal: 0.6 }); tip.rotation.x = Math.PI / 2; tip.position.z = 0.4; g.add(tip);
      for (let k = 0; k < 2; k++) { const f = mesh(new THREE.PlaneGeometry(0.05, 0.1), 0xff6b4f, { mat: { side: THREE.DoubleSide } }); f.position.z = -0.32; f.rotation.set(Math.PI / 2, k * Math.PI / 2, 0); g.add(f); }
      root.add(g); return g;
    }

    let shot = 0, score = 0, wind = 0, dist = 18, moving = false, amp = 0, flying = null, wait = 0;
    ctx.setView(V(0, 1.6, 0), V(0, 1.45, -20));
    hud.crosshair(!VR);
    function vrDraw() {
      const d = ctx.hand(), bw = ctx.offHand();
      return { d, bw, power: clamp(d.pos.distanceTo(bw.pos) / 0.62, 0, 1), dir: bw.pos.clone().sub(d.pos).normalize() };
    }
    function newRound() {
      wind = (Math.random() * 2 - 1) * (shot < 2 ? 0.6 : 2.6);
      dist = 18 + shot * 1.6; moving = shot >= 4; amp = 0.7 + (shot - 4) * 0.3;
      T.position.set(0, 1.5, -dist);
      hud.info(`Arrow ${shot + 1}/8 · ${dist.toFixed(0)} m · wind ${wind >= 0 ? '→' : '←'} ${Math.abs(wind).toFixed(1)} m/s${moving ? ' · moving target!' : ''}`);
    }
    function resolve(text, pts) {
      score += pts; hud.score(score); hud.toast(text); ctx.sfx(pts >= 9 ? 'cheer' : pts ? 'score' : 'miss');
      flying = null; wait = 1.3;
    }
    newRound();

    return {
      onPress() {
        if (!VR) return;
        const bw = ctx.offHand().obj;
        if (bowOuter.parent !== bw) bw.add(bowOuter);
      },
      onRelease() {
        if (flying || wait > 0) return;
        let p = input.lastCharge, dir = input.ray.direction.clone().normalize(), pos = input.ray.origin.clone().addScaledVector(dir, 0.6);
        if (VR) {
          const v = vrDraw(); p = v.power; dir = v.dir; pos = v.bw.pos.clone().addScaledVector(dir, 0.3);
          if (nock) nock.visible = false;
          ctx.buzz(0.8, 60);
        }
        if (p < 0.15) { hud.toast('Draw further!', 700); return; }
        const a = makeArrow();
        flying = { m: a, pos, vel: dir.multiplyScalar(30 + p * 30) };
        ctx.sfx('whoosh');
      },
      update(dt, t) {
        if (moving) T.position.x = Math.sin(t * 1.25) * amp;
        const sp = strGeo.attributes.position;
        if (VR) {
          const drawing = input.down && !flying && wait <= 0;
          if (drawing) {
            const v = vrDraw();
            bowInner.updateMatrixWorld();
            const loc = bowInner.worldToLocal(v.d.pos.clone());
            sp.setXYZ(1, loc.x, loc.y, loc.z);
            if (!nock) nock = makeArrow();
            nock.visible = true;
            nock.position.copy(v.d.pos).addScaledVector(v.dir, 0.36); nock.lookAt(v.bw.pos.clone().addScaledVector(v.dir, 1));
            if (Math.random() < v.power * 0.3) ctx.buzz(0.1 + v.power * 0.3, 15);
          } else { sp.setXYZ(1, 0, 0, 0); if (nock) nock.visible = false; }
          sp.needsUpdate = true;
        } else {
          const draw = input.down && !flying ? input.charge() : 0;
          hud.power(input.down && !flying ? draw : null);
          sp.setY(1, -draw * 0.22); sp.needsUpdate = true;
          camera.fov += ((input.down ? 36 : 60) - camera.fov) * Math.min(1, dt * 6); camera.updateProjectionMatrix();
        }
        if (flying) {
          const f = flying, prev = f.pos.clone();
          f.vel.y -= 9.8 * dt; f.vel.x += wind * 0.7 * dt;
          f.pos.addScaledVector(f.vel, dt);
          f.m.position.copy(f.pos); f.m.lookAt(f.pos.clone().add(f.vel));
          const fz = T.position.z + 0.13;
          if (prev.z > fz && f.pos.z <= fz) {
            const k = (prev.z - fz) / (prev.z - f.pos.z);
            const hit = prev.lerp(f.pos, k);
            const dx = hit.x - T.position.x, dy = hit.y - T.position.y, d = Math.hypot(dx, dy);
            if (d < 0.78) {
              const ring = d < 0.6 ? 10 - Math.floor(d / 0.06) : 0;
              f.m.position.set(dx, dy, 0.13 + 0.3); T.add(f.m);
              ctx.fx.burst(hit.clone().setZ(fz + 0.05), { count: 14, colors: [0xe4bd5f, 0xffffff, colors[Math.max(0, ring - 1)] ?? 0xe4bd5f], speed: 2, up: 1, size: 0.035, life: 0.7 });
              ctx.popup(ring ? '+' + ring : '0', hit.clone().add(V(0, 0.4, 0.3)), ring >= 9 ? '#ffc93c' : '#ffffff');
              if (ring === 10) ctx.shake(0.25);
              return resolve(ring === 10 ? 'BULLSEYE! 10' : ring ? '+' + ring : 'Straw!', ring);
            }
          }
          if (f.pos.y < 0.02) { f.pos.y = 0.02; f.m.position.copy(f.pos); ctx.fx.dust(f.pos.clone(), 10, 0x79c96a); return resolve('Miss', 0); }
          if (f.pos.z < -70) { f.m.visible = false; return resolve('Miss', 0); }
        } else if (wait > 0) {
          wait -= dt;
          if (wait <= 0) { shot++; if (shot >= 8) ctx.finish(score, 'Max is 80.'); else newRound(); }
        }
      },
      dispose() {
        camera.fov = 60; camera.updateProjectionMatrix();
        if (VR && bowOuter.parent) { bowOuter.parent.remove(bowOuter); bowOuter.traverse((n) => { n.geometry?.dispose(); n.material?.dispose(); }); }
      },
    };
  },
};

export const SPORTS_A = [bowling, archery];
