import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ============ BASKETBALL (3 point contest) ============
const basketball = {
  id: 'basketball', name: '3-Point Contest', emoji: '🏀', blurb: 'Five spots around the arc. The last ball on each rack is worth two.',
  how: 'Face the hoop · hold & release on the dark marker for the perfect arc',
  create(ctx) {
    const { root, mesh, hud, input, tex } = ctx;
    const H = V(0, 3.05, -6), RR = 0.23, BR = 0.12, BZ = -6.38, G = 9.8, TH = (52 * Math.PI) / 180;
    const slab = mesh(new THREE.BoxGeometry(16, 0.2, 14), 0x1f5f7a); slab.position.set(0, -0.09, -2.5); root.add(slab);
    const court = mesh(new THREE.PlaneGeometry(15, 13), 0xffffff, { cast: false, rough: 0.22, mat: { map: tex.wood('#e6a463', 28, [1, 1], 8), envMapIntensity: 1.1 } }); court.rotation.x = -Math.PI / 2; court.position.set(0, 0.012, -2.5); root.add(court);
    const key = mesh(new THREE.PlaneGeometry(4.9, 5.8), 0x13a9c2, { cast: false, rough: 0.25 }); key.rotation.x = -Math.PI / 2; key.position.set(0, 0.015, H.z + 2.6); root.add(key);
    const ft = mesh(new THREE.RingGeometry(1.75, 1.8, 48, 1, 0, Math.PI), 0xffffff, { cast: false }); ft.rotation.x = -Math.PI / 2; ft.position.set(0, 0.018, H.z + 5.5); root.add(ft);
    const arc = mesh(new THREE.RingGeometry(6.72, 6.8, 64, 1, 0, Math.PI), 0xffffff, { cast: false }); arc.rotation.x = -Math.PI / 2; arc.position.set(0, 0.02, H.z); root.add(arc);
    const logo = mesh(new THREE.CircleGeometry(1.2, 40), 0xffffff, { cast: false, mat: { map: tex.label('WIDR', '#ff6b4f', '#fff4dc', 512, 512), transparent: true, opacity: 0.85 } }); logo.rotation.x = -Math.PI / 2; logo.position.set(0, 0.016, 2.8); root.add(logo);
    // glass backboard with a frame
    const board = mesh(new THREE.BoxGeometry(1.8, 1.05, 0.03), 0xdff4ff, { rough: 0.05, metal: 0.1, cast: false, mat: { transparent: true, opacity: 0.32, envMapIntensity: 2 } }); board.position.set(0, 3.35, BZ - 0.02); root.add(board);
    [[0, 3.875, 1.84, 0.05], [0, 2.825, 1.84, 0.05], [0.9, 3.35, 0.05, 1.1], [-0.9, 3.35, 0.05, 1.1]].forEach(([x, y, w, h]) => { const f = mesh(new THREE.BoxGeometry(w, h, 0.05), 0xffffff, { metal: 0.5, rough: 0.3 }); f.position.set(x, y, BZ - 0.02); root.add(f); });
    const sq = mesh(new THREE.PlaneGeometry(0.59, 0.45), 0xff6b4f, { cast: false }); sq.position.set(0, 3.27, BZ + 0.002); root.add(sq);
    const sqIn = mesh(new THREE.PlaneGeometry(0.5, 0.37), 0xdff4ff, { cast: false, mat: { transparent: true, opacity: 0.5 } }); sqIn.position.set(0, 3.27, BZ + 0.003); root.add(sqIn);
    const pole = mesh(new THREE.CylinderGeometry(0.09, 0.11, 3.6, 16), 0x123247, { metal: 0.6, rough: 0.35 }); pole.position.set(0, 1.8, BZ - 1.1); root.add(pole);
    const pad = mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.6, 16), 0xff6b4f); pad.position.set(0, 0.8, BZ - 1.1); root.add(pad);
    const arm = mesh(new THREE.BoxGeometry(0.12, 0.12, 1.1), 0x123247, { metal: 0.6, rough: 0.35 }); arm.position.set(0, 3.3, BZ - 0.6); root.add(arm);
    const rim = mesh(new THREE.TorusGeometry(RR, 0.012, 10, 40), 0xff5a1f, { metal: 0.7, rough: 0.3 }); rim.rotation.x = Math.PI / 2; rim.position.copy(H); root.add(rim);
    const net = new THREE.Mesh(new THREE.CylinderGeometry(RR, 0.14, 0.42, 16, 4, true), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.9 }));
    net.position.set(H.x, H.y - 0.21, H.z); root.add(net);
    // bleachers with a bobbing crowd
    const crowd = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.17, 0.3, 4, 8), new THREE.MeshStandardMaterial({ roughness: 0.7 }), 48);
    const cc = new THREE.Color(), dm = new THREE.Object3D(), seats = [];
    for (let row = 0; row < 3; row++) {
      const step = mesh(new THREE.BoxGeometry(1.1, 0.4 + row * 0.45, 9), 0xffffff, { mat: { map: tex.wood('#2d8aa6', 6) } }); step.position.set(-8.6 - row * 1.1, (0.4 + row * 0.45) / 2, -3); root.add(step);
      for (let k = 0; k < 16; k++) seats.push({ x: -8.6 - row * 1.1, y: 0.4 + row * 0.45 + 0.3, z: -7 + k * 0.53, ph: Math.random() * 6 });
    }
    seats.forEach((s, i) => crowd.setColorAt(i, cc.set([0xff6b4f, 0xffc93c, 0x13a9c2, 0x2f9e5b, 0xffffff, 0x8a5cff][i % 6])));
    crowd.castShadow = true; root.add(crowd);
    let cheerT = 0;
    const ball = mesh(new THREE.SphereGeometry(BR, 32, 20), 0xf07a2a, { rough: 0.75 });
    for (let k = 0; k < 3; k++) { const s = mesh(new THREE.TorusGeometry(BR * 1.002, 0.0045, 4, 32), 0x2a1a10); s.rotation.set(k === 2 ? Math.PI / 2 : 0, k * Math.PI / 2, 0); ball.add(s); }
    root.add(ball);

    const spots = [-1.2, -0.6, 0, 0.6, 1.2].map((a) => V(H.x + Math.sin(a) * 6.9, 0, H.z + Math.cos(a) * 6.9));
    spots.forEach((s) => { const d = mesh(new THREE.CircleGeometry(0.35, 24), 0xffc93c, { cast: false }); d.rotation.x = -Math.PI / 2; d.position.set(s.x, 0.025, s.z); root.add(d); });

    let spot = 0, n = 0, score = 0, state = 'aim', t0 = 0, scored = false, swish = 0;
    const p = V(), v = V(), VR = ctx.vr;
    if (VR) ctx.laser(false);
    function setup() {
      const s = spots[spot];
      ctx.setView(V(s.x, 1.85, s.z), V(H.x, 2.6, H.z));
      const money = n === 2;
      ball.material.color.set(money ? 0xff3d6e : 0xf07a2a);
      const f = V(H.x - s.x, 0, H.z - s.z).normalize();
      p.set(s.x + f.x * 0.45, 1.95, s.z + f.z * 0.45);
      ball.position.copy(p); v.set(0, 0, 0); state = 'aim'; scored = false;
      hud.info(`Spot ${spot + 1}/5 · Ball ${n + 1}/3${money ? ' · 💰 money ball ×2' : ''}${VR ? ' · trigger to grab, shoot & let go' : ''}`);
    }
    function idealMark() {
      const d = Math.hypot(H.x - p.x, H.z - p.z), h = H.y - p.y;
      const vv = Math.sqrt((G * d * d) / (2 * Math.cos(TH) ** 2 * (d * Math.tan(TH) - h)));
      return clamp((vv - 6.5) / 5, 0, 1);
    }
    function next() {
      n++;
      if (n > 2) { n = 0; spot++; }
      if (spot > 4) { ctx.finish(score, 'Max is 20.'); return; }
      setup();
    }
    setup();

    return {
      onRelease() {
        if (state !== 'aim') return;
        if (VR) {
          // real shot: ball leaves the hand with the controller's velocity
          const h = ctx.hand();
          if (h.vel.length() < 2) { hud.toast('Shoot it!', 700); return; }
          p.copy(h.pos); v.copy(h.vel).multiplyScalar(1.25);
          if (v.length() > 13) v.setLength(13);
          state = 'fly'; t0 = 0; ctx.buzz(0.5, 50); ctx.sfx('whoosh');
          return;
        }
        const pw = input.lastCharge;
        if (pw < 0.05) return;
        const f = ctx.aimYaw(), sp = 6.5 + pw * 5;
        v.set(f.x * Math.cos(TH) * sp, Math.sin(TH) * sp, f.z * Math.cos(TH) * sp);
        state = 'fly'; t0 = 0; hud.power(null); ctx.sfx('whoosh');
      },
      update(dt) {
        if (swish > 0) { swish -= dt; net.scale.set(1, 1 + Math.sin(swish * 20) * 0.15 * swish, 1); }
        cheerT = Math.max(0, cheerT - dt);
        const now = performance.now() / 1000;
        seats.forEach((s, i) => { const j = Math.abs(Math.sin(now * (cheerT > 0 ? 9 : 2) + s.ph)) * (cheerT > 0 ? 0.35 : 0.04); dm.position.set(s.x, s.y + j, s.z); dm.updateMatrix(); crowd.setMatrixAt(i, dm.matrix); });
        crowd.instanceMatrix.needsUpdate = true;
        if (state === 'aim') {
          if (VR) { if (input.down) ball.position.copy(ctx.hand().pos); else ball.position.set(p.x, p.y - 0.6 + Math.sin(performance.now() / 300) * 0.02, p.z); return; }
          hud.power(input.down ? input.charge() : null, idealMark());
          ball.position.y = p.y + Math.sin(performance.now() / 300) * 0.02;
          return;
        }
        if (state !== 'fly') return;
        t0 += dt;
        const steps = 4, h = dt / steps;
        for (let i = 0; i < steps; i++) {
          const py = p.y;
          v.y -= G * h; p.addScaledVector(v, h);
          // backboard
          if (p.z - BR < BZ && p.z > BZ - 0.3 && Math.abs(p.x) < 0.9 && p.y > 2.83 && p.y < 3.88 && v.z < 0) { p.z = BZ + BR; v.z = -v.z * 0.6; ctx.sfx('thud'); }
          // rim
          const dx = p.x - H.x, dz = p.z - H.z, L = Math.hypot(dx, dz) || 1e-4;
          const c = V(H.x + (dx / L) * RR, H.y, H.z + (dz / L) * RR);
          const diff = p.clone().sub(c), dist = diff.length();
          if (dist < BR + 0.014) {
            const nrm = diff.divideScalar(dist || 1e-4);
            p.copy(c).addScaledVector(nrm, BR + 0.014);
            const vn = v.dot(nrm);
            if (vn < 0) { v.addScaledVector(nrm, -1.55 * vn); v.multiplyScalar(0.85); ctx.sfx('hit'); }
          }
          if (!scored && py >= H.y && p.y < H.y && Math.hypot(p.x - H.x, p.z - H.z) < RR - 0.03) {
            scored = true; const pts = n === 2 ? 2 : 1; score += pts; hud.score(score);
            hud.toast(pts === 2 ? 'MONEY! +2' : 'SWISH! +1'); ctx.sfx('score'); swish = 1; v.x *= 0.3; v.z *= 0.3;
            cheerT = 1.6; ctx.fx.burst(H.clone(), { count: 30, colors: [0xffc93c, 0xff6b4f, 0xffffff], speed: 2.5, up: 2, size: 0.05, life: 1, gravity: 5 });
            ctx.popup('+' + pts, H.clone().add(V(0, 0.6, 0.3)));
            if (pts === 2) ctx.fx.confetti(H.clone().add(V(0, 1, 1)), 90);
          }
          if (p.y < BR) { p.y = BR; if (v.y < 0) v.y = -v.y * 0.62; v.x *= 0.9; v.z *= 0.9; if (Math.abs(v.y) > 1) ctx.sfx('thud'); }
        }
        ball.position.copy(p); ball.rotation.x -= dt * 8;
        if (t0 > 2.6) { if (!scored) { hud.toast('Brick!', 700); ctx.sfx('miss'); } next(); }
      },
    };
  },
};

// ============ GOLF (putting) ============
const HOLES = [
  { tee: [0, 6], cup: [0, -5], slope: [0, 0], walls: [] },
  { tee: [-4, 7], cup: [4, -5], slope: [0.25, 0], walls: [] },
  { tee: [0, 8], cup: [0, -6], slope: [0, 0], walls: [[0, 0, 3.2, 0.3]] },
  { tee: [5, 6], cup: [-5, -5], slope: [0, 0.18], walls: [[0, 0.5, 0.3, 6]] },
  { tee: [0, 9], cup: [0, -8], slope: [-0.2, 0], walls: [[-1.8, -2, 4, 0.3], [1.8, 2.5, 4, 0.3]] },
  { tee: [-7, 6], cup: [7, -6], slope: [0.12, 0.12], walls: [[-1, 1, 4, 0.3], [3, -3, 0.3, 4]] },
];
const golf = {
  id: 'golf', name: 'Island Putting', emoji: '⛳', blurb: 'Six sloped greens with walls. Fewer strokes, more points.',
  how: 'Point where to putt · hold for strength · release. Watch the slope arrows.',
  create(ctx) {
    const { root, mesh, hud, input, tex } = ctx;
    const BR = 0.05, CUP = 0.11, GR = 11.8;
    const fringe = mesh(new THREE.CircleGeometry(13.4, 72), 0xffffff, { cast: false, rough: 0.95, mat: { map: tex.grass(6, [3, 3], '#3f9a45', '#3a8f40') } }); fringe.rotation.x = -Math.PI / 2; fringe.position.y = 0.004; root.add(fringe);
    // freshly mown stripes
    const green = mesh(new THREE.CircleGeometry(12, 72), 0xffffff, { cast: false, rough: 0.85, mat: { map: tex.grass(14, [1, 1], '#74d05e', '#62bf4f') } }); green.rotation.x = -Math.PI / 2; green.rotation.z = 0.5; green.position.y = 0.008; root.add(green);
    const lip = mesh(new THREE.TorusGeometry(12, 0.08, 6, 96), 0x2f7d3a, { cast: false }); lip.rotation.x = Math.PI / 2; lip.position.y = 0.01; root.add(lip);
    for (const [a, r, s] of [[0.6, 13.9, 1.6], [2.4, 14.2, 2.1], [4.1, 13.8, 1.3], [5.3, 14.4, 1.8]]) {
      const bunker = mesh(new THREE.CircleGeometry(s, 24), 0xffffff, { cast: false, rough: 1, mat: { map: tex.sand([2, 2]) } }); bunker.rotation.x = -Math.PI / 2; bunker.scale.set(1.5, 1, 1); bunker.position.set(Math.cos(a) * r, 0.006, Math.sin(a) * r); root.add(bunker);
    }
    const hg = new THREE.Group(); root.add(hg);
    const ball = mesh(new THREE.SphereGeometry(BR, 24, 16), 0xffffff, { rough: 0.35, mat: { envMapIntensity: 1.3 } }); root.add(ball);
    const aimGeo = new THREE.BufferGeometry().setFromPoints([V(), V()]);
    const aimLine = new THREE.Line(aimGeo, new THREE.LineBasicMaterial({ color: 0xff6b4f })); root.add(aimLine);

    let hole = 0, strokes = 0, total = 0, state = 'aim', H = HOLES[0], sinkT = 0;
    const VR = ctx.vr;
    let armed = false;
    const putter = new THREE.Group();
    const shaftGeo = new THREE.CylinderGeometry(0.008, 0.008, 1, 6); shaftGeo.translate(0, 0.5, 0);
    const shaft = mesh(shaftGeo, 0xd8dde0, { metal: 0.7, rough: 0.3 });
    const pHead = mesh(new THREE.BoxGeometry(0.13, 0.035, 0.045), 0x123247, { metal: 0.5 });
    putter.add(shaft, pHead); putter.visible = VR; root.add(putter);
    if (VR) ctx.laser(false);
    const b = V(), v = V(), cup = V(), aim = V(0, 0, -1), viewDir = V(0, 0, -1);
    const cam = V(), look = V(), camT = V(), lookT = V();
    let flag;
    function build() {
      hg.traverse((c) => { c.geometry?.dispose(); c.material?.map?.dispose(); }); hg.clear();
      H = HOLES[hole];
      cup.set(H.cup[0], 0, H.cup[1]);
      const hole3 = mesh(new THREE.CircleGeometry(CUP, 24), 0x0b1a12, { cast: false }); hole3.rotation.x = -Math.PI / 2; hole3.position.set(cup.x, 0.012, cup.z); hg.add(hole3);
      const cupRim = mesh(new THREE.RingGeometry(CUP, CUP + 0.025, 24), 0xffffff, { cast: false }); cupRim.rotation.x = -Math.PI / 2; cupRim.position.set(cup.x, 0.013, cup.z); hg.add(cupRim);
      const pole = mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.6, 8), 0xffffff, { metal: 0.5, rough: 0.3 }); pole.position.set(cup.x, 0.8, cup.z); hg.add(pole);
      flag = mesh(new THREE.PlaneGeometry(0.5, 0.32, 8, 1), 0xffffff, { mat: { side: THREE.DoubleSide, map: tex.label(String(hole + 1), '#ff6b4f', '#fff4dc', 256, 160) } }); flag.position.set(cup.x + 0.26, 1.42, cup.z); hg.add(flag);
      const wallTex = tex.wood('#b5703d', 4, [2, 1], hole);
      H.walls.forEach(([cx, cz, w, d]) => { const wl = mesh(new THREE.BoxGeometry(w, 0.18, d), 0xffffff, { mat: { map: wallTex } }); wl.position.set(cx, 0.09, cz); hg.add(wl); });
      const sl = Math.hypot(H.slope[0], H.slope[1]);
      if (sl > 0) {
        const ang = Math.atan2(H.slope[0], H.slope[1]);
        for (let i = 0; i < 14; i++) {
          const a = i * 2.1, r = 2 + (i % 5) * 1.9;
          const ar = mesh(new THREE.ConeGeometry(0.12, 0.35, 3), 0xa8e88f, { cast: false });
          ar.rotation.x = Math.PI / 2; const holder = new THREE.Group(); holder.add(ar);
          holder.rotation.y = ang; holder.position.set(Math.cos(a) * r, 0.02, Math.sin(a) * r); ar.scale.set(1, 1, 0.15);
          hg.add(holder);
        }
      }
      b.set(H.tee[0], BR, H.tee[1]); v.set(0, 0, 0); strokes = 0; state = 'aim';
      ball.visible = true; ball.position.copy(b);
      setViewTargets(true); info();
    }
    function setViewTargets(snap) {
      viewDir.set(cup.x - b.x, 0, cup.z - b.z); if (viewDir.lengthSq() < 0.01) viewDir.set(0, 0, -1); viewDir.normalize();
      camT.copy(b).addScaledVector(viewDir, VR ? -0.55 : -2.8); camT.y = 1.7;
      lookT.copy(b).addScaledVector(viewDir, 2.4); lookT.y = 0;
      if (snap || VR) { cam.copy(camT); look.copy(lookT); }
      armed = false;
    }
    function info() {
      const sl = Math.hypot(H.slope[0], H.slope[1]);
      hud.info(`Hole ${hole + 1}/6 · Stroke ${strokes + 1} · ${sl ? 'slope ' + (sl > 0.2 ? 'strong' : 'gentle') : 'flat green'}${VR ? ' · swing the putter through the ball' : ''}`);
    }
    function holeDone(sunk) {
      const pts = [0, 5, 3, 2, 1, 0, 0, 0][Math.min(strokes, 7)] || 0;
      total += sunk ? pts : 0; hud.score(total);
      hud.toast(!sunk ? 'Picked up' : strokes === 1 ? 'HOLE IN ONE!' : `In! ${strokes} strokes`);
      ctx.sfx(sunk ? (strokes === 1 ? 'cheer' : 'score') : 'miss');
      state = 'wait'; sinkT = 1.6;
    }
    build();

    return {
      onRelease() {
        if (state !== 'aim' || VR) return;
        const pw = input.lastCharge; if (pw < 0.04) return;
        v.copy(aim).multiplyScalar(0.4 + pw * 7.2); strokes++; state = 'roll'; aimLine.visible = false; hud.power(null); ctx.sfx('hit'); ctx.fx.dust(b.clone(), 6, 0x9be27f);
      },
      update(dt, t) {
        if (flag) flag.rotation.y = Math.sin(t * 3) * 0.3;
        cam.lerp(camT, Math.min(1, dt * 3)); look.lerp(lookT, Math.min(1, dt * 3));
        ctx.setView(cam, look);
        if (VR) {
          // putter head hangs under the hand; hitting the ball transfers the head's speed
          const h = ctx.hand();
          const head = V(h.pos.x, 0.03, h.pos.z);
          pHead.position.copy(head); pHead.rotation.y = Math.atan2(viewDir.x, viewDir.z);
          const sv = h.pos.clone().sub(head);
          shaft.position.copy(head); shaft.scale.y = Math.max(0.05, sv.length()); shaft.quaternion.setFromUnitVectors(V(0, 1, 0), sv.normalize());
          const d = Math.hypot(head.x - b.x, head.z - b.z);
          if (state === 'aim') {
            aimLine.visible = false;
            if (d > 0.16) armed = true;
            const hv = V(h.vel.x, 0, h.vel.z);
            if (armed && d < 0.09 && hv.length() > 0.2) {
              v.copy(hv).multiplyScalar(1.3); if (v.length() > 8) v.setLength(8);
              strokes++; state = 'roll'; ctx.sfx('hit'); ctx.buzz(0.7, 50);
            }
          }
        }
        if (state === 'aim' && !VR) {
          const hit = ctx.rayGround(0);
          if (hit) { const d = V(hit.x - b.x, 0, hit.z - b.z); if (d.lengthSq() > 0.01) aim.copy(d.normalize()); }
          const c = input.down ? input.charge() : 0.15;
          const pos = aimGeo.attributes.position;
          pos.setXYZ(0, b.x, 0.03, b.z); pos.setXYZ(1, b.x + aim.x * (0.5 + c * 3), 0.03, b.z + aim.z * (0.5 + c * 3)); pos.needsUpdate = true;
          aimLine.visible = true;
          hud.power(input.down ? c : null);
        } else if (state === 'roll') {
          const steps = 3, h = dt / steps;
          for (let s = 0; s < steps; s++) {
            v.x += H.slope[0] * h; v.z += H.slope[1] * h;
            const sp = Math.hypot(v.x, v.z);
            if (sp > 0) { const dec = Math.min(sp, 0.95 * h); v.x -= (v.x / sp) * dec; v.z -= (v.z / sp) * dec; }
            b.x += v.x * h; b.z += v.z * h;
            for (const [cx, cz, w, d] of H.walls) {
              const px = clamp(b.x, cx - w / 2, cx + w / 2), pz = clamp(b.z, cz - d / 2, cz + d / 2);
              const dx = b.x - px, dz = b.z - pz, dist = Math.hypot(dx, dz);
              if (dist < BR && dist > 1e-5) {
                const nx = dx / dist, nz = dz / dist; b.x = px + nx * BR; b.z = pz + nz * BR;
                const vn = v.x * nx + v.z * nz; if (vn < 0) { v.x -= 1.7 * vn * nx; v.z -= 1.7 * vn * nz; ctx.sfx('thud'); }
              }
            }
            const r = Math.hypot(b.x, b.z);
            if (r > GR) { const nx = -b.x / r, nz = -b.z / r; b.x = -nx * GR; b.z = -nz * GR; const vn = v.x * nx + v.z * nz; if (vn < 0) { v.x -= 1.6 * vn * nx; v.z -= 1.6 * vn * nz; } }
            const dc = Math.hypot(b.x - cup.x, b.z - cup.z);
            if (dc < CUP) {
              if (Math.hypot(v.x, v.z) < 2.6) { state = 'sink'; sinkT = 0; b.x = cup.x; b.z = cup.z; break; }
              v.x += (Math.random() - 0.5) * 0.6; v.z += (Math.random() - 0.5) * 0.6;
            }
          }
          ball.position.set(b.x, BR, b.z); ball.rotation.x -= Math.hypot(v.x, v.z) * dt / BR;
          if (!VR) { camT.copy(b).addScaledVector(viewDir, -2.8); camT.y = 1.7; lookT.copy(b).addScaledVector(viewDir, 2.4); lookT.y = 0; }
          if (state === 'roll' && Math.hypot(v.x, v.z) < 0.05) {
            v.set(0, 0, 0);
            if (strokes >= 6) holeDone(false); else { state = 'aim'; setViewTargets(false); info(); }
          }
        } else if (state === 'sink') {
          sinkT += dt; ball.position.set(cup.x, BR - sinkT * 0.5, cup.z);
          if (sinkT > 0.25) { ball.visible = false; ctx.fx.burst(cup.clone().setY(0.05), { count: 24, colors: [0xffffff, 0xffc93c, 0x74d05e], speed: 1.6, up: 2.5, size: 0.04, life: 0.9 }); if (strokes === 1) ctx.fx.confetti(cup.clone().setY(1.5), 160); holeDone(true); }
        } else if (state === 'wait') {
          sinkT -= dt;
          if (sinkT <= 0) { hole++; if (hole >= HOLES.length) { state = 'over'; ctx.finish(total, 'Max is 30 (all holes-in-one).'); } else build(); }
        }
      },
    };
  },
};

export const SPORTS_B = [basketball, golf];
