import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);

// ============ CANOE SPRINT ============
const canoe = {
  id: 'canoe', name: 'Canoe Sprint', emoji: '🛶', blurb: '200 m head-to-head across the bay. Paddle left, right, left, right…',
  how: 'Alternate ← / → (or A / D, or click left & right half) · same side twice = turn',
  create(ctx) {
    const { root, mesh, hud, input, tex } = ctx;
    const VR = ctx.vr, WY = -0.6, Z0 = 100, LEN = 200, PX = -32, DX = -28;
    // lanes: buoy lines + start pontoon + finish arch
    const buoyGeo = new THREE.SphereGeometry(0.18, 10, 8);
    for (const lx of [PX - 2, (PX + DX) / 2, DX + 2]) {
      for (let z = 0; z <= LEN; z += 5) {
        const late = z > LEN - 25;
        const b = mesh(buoyGeo, late ? 0xe8403a : z % 10 ? 0xffffff : 0xffc93c, { rough: 0.4, cast: false });
        b.position.set(lx, WY, Z0 + z); b.userData.bob = Math.random() * 6; root.add(b);
      }
    }
    const pont = mesh(new THREE.BoxGeometry(14, 0.5, 3), 0xffffff, { mat: { map: tex.wood('#b88550', 12, [1, 1], 21) } }); pont.position.set((PX + DX) / 2, WY + 0.05, Z0 - 3.2); root.add(pont);
    const finZ = Z0 + LEN;
    const fp = mesh(new THREE.BoxGeometry(5, 0.6, 4), 0xffffff, { mat: { map: tex.wood('#a07045', 6, [1, 1], 31) } }); fp.position.set(PX - 5.5, WY + 0.1, finZ + 1); root.add(fp);
    for (const x of [PX - 3, DX + 3]) { const p = mesh(new THREE.CylinderGeometry(0.2, 0.25, 6, 10), 0xff6b4f, { rough: 0.4 }); p.position.set(x, WY + 3, finZ); root.add(p); }
    const banner = mesh(new THREE.BoxGeometry(DX - PX + 6.4, 1.2, 0.15), 0xffffff, { mat: { map: tex.label('FINISH · WIDR BAY', '#123247', '#ffc93c', 1024, 160), emissive: 0xffffff, emissiveIntensity: 0.15 } });
    banner.position.set((PX + DX) / 2, WY + 5.6, finZ); banner.rotation.y = Math.PI; root.add(banner);
    const startB = mesh(new THREE.BoxGeometry(9, 0.8, 0.12), 0xffffff, { mat: { map: tex.label('WIDR CANOE SPRINT', '#ff6b4f', '#fff4dc', 1024, 120) } });
    startB.position.set((PX + DX) / 2, WY + 1.2, Z0 - 4.7); root.add(startB);

    function makeCanoe(color) {
      const g = new THREE.Group();
      const hull = mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), color, { rough: 0.35, mat: { side: THREE.DoubleSide, envMapIntensity: 1.2 } });
      hull.scale.set(0.42, 0.34, 2.1); g.add(hull);
      const rim = mesh(new THREE.TorusGeometry(1, 0.06, 6, 32), 0xfff4dc); rim.rotation.x = Math.PI / 2; rim.scale.set(0.42, 2.1, 1); g.add(rim);
      const seat = mesh(new THREE.BoxGeometry(0.6, 0.06, 0.4), 0x7a5230); seat.position.set(0, -0.12, 0.2); g.add(seat);
      root.add(g); return g;
    }
    function makePaddle(color) {
      const g = new THREE.Group();
      const shaft = mesh(new THREE.CylinderGeometry(0.018, 0.018, 2.1, 8), 0x26313a, { metal: 0.4, rough: 0.4 }); shaft.rotation.z = Math.PI / 2; g.add(shaft);
      for (const s of [-1, 1]) { const bl = mesh(new THREE.BoxGeometry(0.42, 0.02, 0.17), color, { rough: 0.4 }); bl.position.x = s * 1.12; bl.rotation.x = s * 0.4; g.add(bl); }
      return g;
    }
    const me = makeCanoe(0x13a9c2), rival = makeCanoe(0xffc93c);
    const myPaddle = makePaddle(0xff6b4f), rivalPaddle = makePaddle(0x13a9c2);
    const rivalToon = ctx.character({ name: ctx.host.name, ...ctx.host.look });
    rivalToon.scale.setScalar(0.8); rivalToon.position.set(0, -0.62, 0.2); rivalToon.rotation.y = Math.PI; rival.add(rivalToon);
    rivalPaddle.position.set(0, 0.55, -0.2); rival.add(rivalPaddle);
    let meToon = null;
    if (!VR) {
      meToon = ctx.character({ name: 'You', body: 0xff6b4f, hat: 'cap', hatColor: 0xffffff, pants: 0x123247 });
      meToon.scale.setScalar(0.8); meToon.position.set(0, -0.62, 0.2); meToon.rotation.y = Math.PI; me.add(meToon);
      myPaddle.position.set(0, 0.55, -0.2); me.add(myPaddle);
    } else { root.add(myPaddle); ctx.laser(false); }

    const pos = V(PX, WY, Z0), rpos = V(DX, WY, Z0);
    let yaw = 0, speed = 0, rspeed = 0, time = 0, state = 'count', count = 3.5, lastSide = 0, lastStrokeT = -9, strokeAnim = 0, strokeSide = 1;
    let myDone = 0, rivalDone = 0, over = false;
    const hState = [{ low: false }, { low: false }];
    const stroke = (side, power) => {
      speed += power; yaw -= side * (power < 0.5 ? 0.09 : 0.035);
      strokeAnim = 1; strokeSide = side;
      ctx.fx.splash(pos.clone().add(V(side * 0.9 * Math.cos(yaw), WY + 0.05 - pos.y, -side * 0.9 * Math.sin(yaw))), 6);
      ctx.sfx('splash');
    };
    const desktopStroke = (side) => {
      if (state !== 'race' || time - lastStrokeT < 0.25) return;
      const alt = side !== lastSide || time - lastStrokeT > 0.7;
      stroke(side, alt ? 0.75 : 0.32); lastSide = side; lastStrokeT = time;
    };
    hud.info(VR ? 'Hold the paddle in both hands · dip one end low & pull back · alternate sides' : 'Alternate ← → / A D / left-right clicks for full speed');
    hud.score('0.0', 'Time');

    function place(g, p, yw, t, k) {
      const h = ctx.waveY(p.x, p.z);
      g.position.set(p.x, WY + 0.22 + h, p.z); g.rotation.set(Math.sin(t * 2 + k) * 0.03, yw, Math.sin(t * 1.6 + k) * 0.04, 'YXZ');
    }
    return {
      onPress() { if (!VR) desktopStroke(input.ndc.x < 0 ? 1 : -1); },
      onKey(k, down) {
        if (!down) return;
        if (k === 'ArrowLeft' || k === 'a' || k === 'A') desktopStroke(1);
        if (k === 'ArrowRight' || k === 'd' || k === 'D') desktopStroke(-1);
      },
      update(dt, t) {
        const f = V(Math.sin(yaw), 0, Math.cos(yaw)), right = V(-f.z, 0, f.x);
        if (state === 'count') {
          const prev = Math.ceil(count); count -= dt;
          if (Math.ceil(count) !== prev && count > 0 && prev <= 3) { hud.toast(String(Math.ceil(count)), 700); ctx.sfx('click'); }
          if (count <= 0) { state = 'race'; hud.toast('GO!', 800); ctx.sfx('whoosh'); ctx.buzz(0.8, 120); }
        } else if (state === 'race' || state === 'done') {
          time += dt;
          if (!myDone) hud.score(time.toFixed(1), 'Time');
          // rival: steady pace with small surges
          if (!rivalDone) { rspeed += ((4.1 + Math.sin(time * 0.7) * 0.35) - rspeed) * dt * 0.7; rpos.z += rspeed * dt; }
          if (!rivalDone && rpos.z >= finZ) { rivalDone = time; if (!myDone) hud.toast(ctx.host.name + ' finishes!', 1000); }
        }
        // player paddling
        if (VR && state === 'race' && !myDone) {
          const hs = ctx.hands(), boatV = f.clone().multiplyScalar(speed);
          const headY = ctx.camera.position.y;
          hs.forEach((h, i) => {
            const other = hs[1 - i], rel = h.vel.clone().sub(boatV);
            const back = -rel.dot(f), low = h.local.y < other.local.y - 0.12 && h.local.y < headY - 0.45;
            const side = h.pos.clone().sub(pos).dot(right) < 0 ? 1 : -1;
            if (low && back > 0.5) {
              if (!hState[i].low) { ctx.fx.splash(h.pos.clone().setY(WY + 0.05), 7); ctx.sfx('splash'); }
              hState[i].low = true;
              const b = Math.min(back, 3.5);
              speed += b * 1.8 * dt; yaw -= side * b * dt * 0.05;
              ctx.buzz(Math.min(0.6, b * 0.15), 20, h.obj);
            } else hState[i].low = false;
          });
          // paddle shaft runs through both hands, blades beyond them
          const a = hs[0].pos, b = hs[1].pos, mid = a.clone().add(b).multiplyScalar(0.5), dir = b.clone().sub(a).normalize();
          myPaddle.position.copy(mid); myPaddle.quaternion.setFromUnitVectors(V(1, 0, 0), dir);
        }
        if (!VR) {
          strokeAnim = Math.max(0, strokeAnim - dt * 3.2);
          myPaddle.rotation.set(0, Math.sin(t * 0.8) * 0.1, strokeSide * (0.25 + strokeAnim * 0.5));
          if (meToon) meToon.rotation.y = Math.PI + strokeSide * strokeAnim * 0.3;
        }
        rivalPaddle.rotation.set(0, 0, Math.sin(time * 5) * 0.6);
        if (state === 'race' && !rivalDone && Math.random() < dt * 2.5) ctx.fx.splash(rpos.clone().add(V(Math.sin(time * 5) > 0 ? 0.9 : -0.9, 0.05, 0)), 4);
        // physics
        speed -= speed * 0.6 * dt; yaw *= 1 - dt * 0.35;
        pos.addScaledVector(f, speed * dt);
        if (Math.abs(pos.x - PX) > 1.6) { pos.x = PX + Math.sign(pos.x - PX) * 1.6; speed *= 0.97; yaw *= 0.9; ctx.buzz(0.3, 30); }
        place(me, pos, yaw, t, 0); place(rival, rpos, 0, t, 2);
        root.children.forEach((c) => { if (c.userData.bob != null) c.position.y = WY + 0.05 + ctx.waveY(c.position.x, c.position.z) + Math.sin(t * 2 + c.userData.bob) * 0.04; });
        if (state === 'race' && !myDone && pos.z >= finZ) {
          myDone = time; state = 'done';
          const won = !rivalDone, score = Math.max(0, Math.round((95 - time) * 10));
          hud.toast(won ? 'You win the sprint!' : `${ctx.host.name} wins by ${(time - rivalDone).toFixed(1)} s`, 1600);
          ctx.sfx(won ? 'cheer' : 'score'); ctx.fx.confetti(V((PX + DX) / 2, WY + 5, finZ), won ? 200 : 60);
          hud.score(score);
          setTimeout(() => { if (!over) { over = true; ctx.finish(score, `${time.toFixed(1)} s for 200 m${won ? ' · beat ' + ctx.host.name : ''}`, won); } }, 1200);
        }
        if (state !== 'count') hud.info(`${Math.max(0, finZ - pos.z).toFixed(0)} m to go · ${(speed * 3.6).toFixed(1)} km/h · ${ctx.host.name} ${rpos.z > pos.z ? '+' : '−'}${Math.abs(rpos.z - pos.z).toFixed(1)} m`);
        // camera
        if (VR) ctx.setView(pos.clone().addScaledVector(f, -0.05), pos.clone().addScaledVector(f, 10), WY + 0.15 + ctx.waveY(pos.x, pos.z));
        else ctx.setView(pos.clone().addScaledVector(f, -5.2).add(V(1.6, 2.4, 0)), pos.clone().addScaledVector(f, 6).add(V(1.2, 0.4, 0)));
      },
    };
  },
};

// ============ SUPER SAVE (goalkeeper) ============
function netTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 5;
  g.strokeRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
const keeper = {
  id: 'keeper', name: 'Super Save', emoji: '🧤', blurb: 'Beach penalties. You are the keeper. Stop the curlers, the rockets and the golden ball.',
  how: 'Move the mouse to steer your gloves · hold the button at impact to catch for bonus',
  create(ctx) {
    const { root, mesh, hud, input, tex, camera } = ctx;
    const VR = ctx.vr, GW = 1.6, GH = 2.1, R = 0.11, SHOTS = 12, GZ = -0.35;
    const sand = mesh(new THREE.PlaneGeometry(16, 24), 0xffffff, { cast: false, mat: { map: tex.sand(6) } }); sand.rotation.x = -Math.PI / 2; sand.position.set(0, 0.01, -8); root.add(sand);
    const line = (w, d, x, z) => { const l = mesh(new THREE.PlaneGeometry(w, d), 0xffffff, { cast: false, mat: { transparent: true, opacity: 0.8 } }); l.rotation.x = -Math.PI / 2; l.position.set(x, 0.02, z); root.add(l); };
    line(10, 0.08, 0, 0); line(0.08, 4, -4.5, -2); line(0.08, 4, 4.5, -2); line(9, 0.08, 0, -4); line(0.25, 0.25, 0, -9);
    const post = (geo, x, y, z) => { const p = mesh(geo, 0xffffff, { rough: 0.3, metal: 0.1 }); p.position.set(x, y, z); root.add(p); return p; };
    const pg = new THREE.CylinderGeometry(0.06, 0.06, GH, 12);
    post(pg, -GW, GH / 2, 0); post(pg, GW, GH / 2, 0);
    const bar = post(new THREE.CylinderGeometry(0.06, 0.06, GW * 2 + 0.12, 12), 0, GH, 0); bar.rotation.z = Math.PI / 2;
    const nt = netTexture();
    const netMat = (rx, ry) => { const t = nt.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return new THREE.MeshBasicMaterial({ map: t, transparent: true, side: THREE.DoubleSide, depthWrite: false }); };
    const back = new THREE.Mesh(new THREE.PlaneGeometry(GW * 2, GH, 16, 8), netMat(16, 10)); back.position.set(0, GH / 2, 1.3); root.add(back);
    const top = new THREE.Mesh(new THREE.PlaneGeometry(GW * 2, 1.3), netMat(16, 6)); top.rotation.x = Math.PI / 2; top.position.set(0, GH, 0.65); root.add(top);
    for (const s of [-1, 1]) { const sd = new THREE.Mesh(new THREE.PlaneGeometry(1.3, GH), netMat(6, 10)); sd.rotation.y = Math.PI / 2; sd.position.set(s * GW, GH / 2, 0.65); root.add(sd); }
    const netPos = back.geometry.attributes.position, netBase = netPos.array.slice();
    for (const s of [-1, 1]) {
      const board = mesh(new THREE.BoxGeometry(5, 0.8, 0.12), 0xffffff, { mat: { map: tex.label(s < 0 ? 'WIDR CUP' : 'WIDR 64', s < 0 ? '#13a9c2' : '#ff6b4f', '#fff4dc', 512, 90) } });
      board.position.set(s * 6.5, 0.4, -3); board.rotation.y = -s * 1.2; root.add(board);
    }

    // kicker
    const kicker = ctx.character({ name: ctx.host.name, ...ctx.host.look });
    kicker.position.set(0.6, 0, -11.5); kicker.lookAt(0, 0, 0); root.add(kicker);
    const ball = mesh(new THREE.SphereGeometry(R, 20, 14), 0xffffff, { rough: 0.45, mat: { map: tex.label('●', '#ffffff', '#123247', 128, 64) } }); root.add(ball);

    // gloves
    function glove(s) {
      const g = new THREE.Group();
      const palm = mesh(new THREE.BoxGeometry(0.15, 0.17, 0.06), 0xffc93c, { rough: 0.5 }); g.add(palm);
      for (let k = 0; k < 4; k++) { const fi = mesh(new THREE.BoxGeometry(0.03, 0.08, 0.04), 0xffc93c); fi.position.set(-0.055 + k * 0.037, 0.12, 0); g.add(fi); }
      const th = mesh(new THREE.BoxGeometry(0.035, 0.07, 0.04), 0xffc93c); th.position.set(s * 0.09, 0.02, 0); th.rotation.z = -s * 0.6; g.add(th);
      const cuff = mesh(new THREE.BoxGeometry(0.16, 0.06, 0.07), 0x123247); cuff.position.y = -0.11; g.add(cuff);
      root.add(g); return g;
    }
    const gl = [glove(-1), glove(1)];
    const gPos = V(0, 1.1, GZ), gVel = V();
    if (VR) { ctx.setView(V(0, 1.6, 0.15), V(0, 1, -9)); ctx.laser(false); }
    else ctx.setView(V(0, 1.4, 1.75), V(0, 0.95, -9));

    let shot = 0, score = 0, saves = 0, state = 'wait', wait = 2.2, fly = null, runT = 0, held = null, bulge = 0, bulgeX = 0;
    const bv = V(), acc = V(), prevBall = V();
    function setupShot() {
      const golden = shot === 5 || shot === SHOTS - 1, k = shot / (SHOTS - 1);
      const T = golden ? 0.85 : 1.15 - k * 0.38 + rnd(-0.05, 0.05);
      const tgt = V(rnd(-GW + 0.25, GW - 0.25), rnd(0.25, GH - 0.25), 0.05);
      if (Math.random() < 0.35 + k * 0.3) tgt.x = Math.sign(tgt.x || 1) * rnd(0.9, GW - 0.22); // corners more often later
      const curve = shot > 1 && Math.random() < 0.5 ? rnd(-5, 5) : 0, dip = shot > 3 && Math.random() < 0.35 ? -6 : 0;
      ball.position.set(0, R, -9); prevBall.copy(ball.position);
      acc.set(curve, -9.8 + dip, 0);
      bv.copy(tgt).sub(ball.position).addScaledVector(acc, -0.5 * T * T).divideScalar(T);
      ball.material.color.set(golden ? 0xffc93c : 0xffffff);
      ball.material.emissive?.set(golden ? 0x5a3a00 : 0x000000);
      return { golden, T, kind: golden ? 'GOLDEN BALL' : curve ? 'Curler' : dip ? 'Dipper' : T < 0.9 ? 'Rocket' : 'Shot' };
    }
    fly = setupShot();
    hud.info(`Shot 1/${SHOTS}${VR ? ' · reach with your hands · trigger at impact = catch' : ''}`); hud.score(0);
    const segDist = (a, b, p) => { const ab = b.clone().sub(a), u = clamp(p.clone().sub(a).dot(ab) / Math.max(1e-6, ab.lengthSq()), 0, 1); return a.clone().addScaledVector(ab, u).distanceTo(p); };
    function resolve(saved, caught, punchVel) {
      if (saved) {
        const pts = (100 + (caught ? 50 : 0)) * (fly.golden ? 2 : 1);
        saves++; score += pts; hud.score(score);
        ctx.popup((caught ? 'CATCH! +' : 'SAVE! +') + pts, ball.position.clone().add(V(0, 0.3, 0)), fly.golden ? '#ffc93c' : '#ffffff');
        ctx.sfx(fly.golden || caught ? 'cheer' : 'score'); ctx.shake(0.15);
        ctx.fx.burst(ball.position.clone(), { count: 24, colors: [0xffc93c, 0xffffff], speed: 3, up: 1, size: 0.035, life: 0.6, gravity: 5 });
        if (caught) state = 'caught';
        else { bv.copy(punchVel); acc.set(0, -9.8, 0); state = 'loose'; }
      } else {
        ctx.sfx('miss'); hud.toast('GOAL… ' + ctx.host.name + ' scores', 1000);
        bulge = 1; bulgeX = ball.position.x; state = 'loose'; bv.multiplyScalar(0.05); acc.set(0, -9.8, 0);
      }
      wait = 1.5;
    }
    return {
      update(dt, t) {
        // gloves follow hands (VR) or the mouse with a speed limit (desktop)
        let handsNow;
        if (VR) {
          const hs = ctx.hands();
          hs.forEach((h, i) => { gl[i].position.copy(h.pos); gl[i].quaternion.copy(h.quat); gl[i].rotateX(-Math.PI / 2); });
          handsNow = hs.map((h) => ({ p: h.pos, v: h.vel, obj: h.obj }));
        } else {
          const hit = ctx.rayPlane(V(0, 0, 1), V(0, 0, GZ)) || gPos;
          const tgt = V(clamp(hit.x, -GW - 0.3, GW + 0.3), clamp(hit.y, 0.15, GH + 0.2), GZ);
          const d = tgt.clone().sub(gPos), maxStep = 7.5 * dt;
          if (d.length() > maxStep) d.setLength(maxStep);
          gVel.copy(d).divideScalar(Math.max(dt, 1e-4)); gPos.add(d);
          gl[0].position.copy(gPos).add(V(-0.1, 0, 0)); gl[1].position.copy(gPos).add(V(0.1, 0, 0));
          const lean = clamp(gVel.x * 0.06, -0.5, 0.5); gl[0].rotation.set(0, 0, -lean + 0.15); gl[1].rotation.set(0, 0, -lean - 0.15);
          handsNow = [{ p: gPos, v: gVel }];
        }
        // net bulge
        bulge = Math.max(0, bulge - dt * 1.6);
        for (let i = 0; i < netPos.count; i++) { const x = netBase[i * 3], y = netBase[i * 3 + 1]; netPos.setZ(i, netBase[i * 3 + 2] + bulge * 0.35 * Math.exp(-((x - bulgeX) ** 2) * 2) * Math.sin((y / GH) * Math.PI)); }
        netPos.needsUpdate = true;

        if (state === 'wait') {
          wait -= dt; runT = Math.max(0, 1 - wait);
          kicker.position.set(0.6 - runT * 0.9, Math.abs(Math.sin(runT * 12)) * 0.05, -11.5 + runT * 2.1);
          if (wait <= 0) { state = 'fly'; ctx.sfx('thud'); hud.toast(fly.kind, 600); kicker.position.set(-0.3, 0, -9.4); }
        } else if (state === 'fly') {
          prevBall.copy(ball.position);
          bv.addScaledVector(acc, dt); ball.position.addScaledVector(bv, dt);
          ball.rotation.x -= dt * 20; ball.rotation.y += acc.x * dt;
          for (const h of handsNow) {
            if (segDist(prevBall, ball.position, h.p) < R + (VR ? 0.12 : 0.17)) {
              const caught = input.down && (VR ? true : gVel.length() < 6);
              const out = V(rnd(-2, 2), rnd(2, 4), -rnd(4, 7)).add(h.v.clone().multiplyScalar(0.6));
              ctx.buzz(1, 90, h.obj); resolve(true, caught, out);
              if (caught) held = h;
              break;
            }
          }
          if (state === 'fly') {
            const pz = ball.position.z;
            if (pz > 0 && Math.abs(ball.position.x) < GW && ball.position.y < GH) resolve(false);
            else if (pz > 0.5 || ball.position.y < -0.5) { ctx.sfx('whoosh'); hud.toast('Wide!', 700); state = 'loose'; wait = 1.2; }
          }
        } else {
          if (state === 'caught') {
            if (VR) { const h = ctx.hand(); ball.position.copy(h.pos).addScaledVector(h.dir, 0.1); } else ball.position.copy(gPos).add(V(0, 0, -0.08));
          } else if (state === 'loose') {
            bv.addScaledVector(acc, dt); ball.position.addScaledVector(bv, dt);
            if (ball.position.z > 1.2) { ball.position.z = 1.2; bv.z *= -0.2; }
            if (ball.position.y < R) { ball.position.y = R; bv.y *= -0.45; bv.x *= 0.8; bv.z *= 0.8; }
          }
          wait -= dt;
          if (wait <= 0) {
            shot++; held = null;
            if (shot >= SHOTS) { state = 'over'; ctx.finish(score, `${saves}/${SHOTS} saves`); return; }
            fly = setupShot(); state = 'wait'; wait = 1.6;
            hud.info(`Shot ${shot + 1}/${SHOTS} · ${saves} saves${fly.golden ? ' · ⭐ golden ball worth double!' : ''}`);
            kicker.position.set(0.6, 0, -11.5);
          }
        }
        kicker.lookAt(0, 0, 0);
      },
    };
  },
};

export const SPORTS_F = [canoe, keeper];
