import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);

// ============ PAD RUSH (boxing) ============
const boxing = {
  id: 'boxing', name: 'Pad Rush', emoji: '🥊', blurb: 'Boxing pads pop up around you. Punch them before their ring closes.',
  how: 'Click a pad before its ring closes · gold pads score big · keep the combo alive',
  create(ctx) {
    const { root, mesh, hud, input, tex, camera } = ctx;
    const VR = ctx.vr, FY = 0.5;
    const ring = mesh(new THREE.BoxGeometry(6.6, FY, 6.6), 0x13a9c2); ring.position.set(0, FY / 2, -0.6); root.add(ring);
    const mat = mesh(new THREE.BoxGeometry(6, 0.02, 6), 0xffffff, { rough: 0.8, mat: { map: tex.label('WIDR', '#1f78b4', '#fff4dc', 512, 512) } }); mat.position.set(0, FY + 0.01, -0.6); root.add(mat);
    const corners = [[-3, -3.6], [3, -3.6], [3, 2.4], [-3, 2.4]];
    corners.forEach(([x, z], i) => { const post = mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.5, 12), i % 2 ? 0xe8403a : 0x2a6fd6, { metal: 0.3, rough: 0.4 }); post.position.set(x, FY + 0.75, z); root.add(post); });
    for (let i = 0; i < 4; i++) {
      const [x0, z0] = corners[i], [x1, z1] = corners[(i + 1) % 4];
      if (i === 2) continue; // open side toward the player
      for (const h of [0.45, 0.85, 1.25]) {
        const len = Math.hypot(x1 - x0, z1 - z0);
        const rope = mesh(new THREE.CylinderGeometry(0.025, 0.025, len, 6), [0xffffff, 0xe8403a, 0x2a6fd6][Math.round(h * 2) % 3], { rough: 0.5 });
        rope.position.set((x0 + x1) / 2, FY + h, (z0 + z1) / 2); rope.rotation.set(Math.PI / 2, 0, 0); rope.lookAt(x1, FY + h, z1); rope.rotateX(Math.PI / 2); root.add(rope);
      }
    }
    for (let k = 0; k < 8; k++) { const b = mesh(new THREE.SphereGeometry(0.08, 8, 6), 0xfff3b0, { cast: false, mat: { emissive: 0xffd060, emissiveIntensity: 2 } }); b.position.set(-2.8 + k * 0.8, FY + 3.2, -3.6); root.add(b); }
    if (VR) { ctx.setView(V(0, FY + 1.6, 0), V(0, FY + 1.4, -1), FY); ctx.laser(false); }
    else ctx.setView(V(0, FY + 1.62, 1.05), V(0, FY + 1.35, -1));

    function glove(color) {
      const g = new THREE.Group();
      const fist = mesh(new THREE.SphereGeometry(0.09, 18, 14), color, { rough: 0.3, mat: { envMapIntensity: 1.3 } }); fist.scale.set(1, 0.92, 1.25); g.add(fist);
      const thumb = mesh(new THREE.SphereGeometry(0.035, 10, 8), color, { rough: 0.3 }); thumb.position.set(0.07, 0.02, -0.03); g.add(thumb);
      const cuff = mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.1, 14), 0xffffff); cuff.rotation.x = Math.PI / 2; cuff.position.z = 0.12; g.add(cuff);
      root.add(g); return g;
    }
    const gL = glove(0x2a6fd6), gR = glove(0xe8403a);
    const restL = V(-0.24, FY + 1.3, 0.62), restR = V(0.24, FY + 1.3, 0.62);
    gL.position.copy(restL); gR.position.copy(restR);
    let punch = null, nextGlove = 0;

    const pads = [];
    let spawnT = 0.8, time = 45, score = 0, combo = 0, best = 0, over = false, hits = 0;
    const COL = { left: 0x2a6fd6, right: 0xe8403a, gold: 0xffc93c };
    function spawn() {
      const kind = Math.random() < 0.13 ? 'gold' : Math.random() < 0.5 ? 'left' : 'right';
      let pos;
      const head = VR ? camera.getWorldPosition(V()) : V(0, FY + 1.62, 1.05);
      if (VR) {
        const f = camera.getWorldDirection(V()); f.y = 0; f.normalize();
        const right = V(-f.z, 0, f.x);
        const side = kind === 'left' ? -rnd(0.12, 0.38) : kind === 'right' ? rnd(0.12, 0.38) : rnd(-0.2, 0.2);
        pos = head.clone().addScaledVector(f, rnd(0.45, 0.6)).addScaledVector(right, side).add(V(0, rnd(-0.4, 0.05), 0));
      } else {
        const x = kind === 'left' ? rnd(-0.62, -0.12) : kind === 'right' ? rnd(0.12, 0.62) : rnd(-0.4, 0.4);
        pos = V(x, FY + rnd(1.1, 1.75), rnd(-0.35, -0.05));
      }
      if (pads.some((p) => p.g.position.distanceTo(pos) < 0.3)) return;
      const g = new THREE.Group(); g.position.copy(pos); g.lookAt(head);
      const disc = mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.05, 28), COL[kind], { rough: 0.45, mat: kind === 'gold' ? { emissive: 0xffa000, emissiveIntensity: 0.5 } : {} }); disc.rotation.x = Math.PI / 2; g.add(disc);
      const face = mesh(new THREE.CircleGeometry(0.09, 24), 0xffffff, { cast: false }); face.position.z = 0.027; g.add(face);
      const dot = mesh(new THREE.CircleGeometry(0.035, 16), COL[kind], { cast: false }); dot.position.z = 0.028; g.add(dot);
      const timer = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 6, 32), new THREE.MeshBasicMaterial({ color: COL[kind], transparent: true, opacity: 0.85 })); g.add(timer);
      root.add(g);
      pads.push({ g, timer, kind, age: 0, life: Math.max(0.95, 1.75 - (45 - time) * 0.017) });
    }
    function removePad(p) { pads.splice(pads.indexOf(p), 1); root.remove(p.g); p.g.traverse((n) => { n.geometry?.dispose(); n.material?.dispose(); }); }
    function hitPad(p, wrongHand) {
      const pos = p.g.position.clone();
      removePad(p);
      const base = p.kind === 'gold' ? 25 : 10;
      if (!wrongHand) combo++;
      best = Math.max(best, combo); hits++;
      const pts = Math.round(base * (1 + Math.min(combo, 20) * 0.1) * (wrongHand ? 0.5 : 1));
      score += pts; hud.score(score);
      ctx.fx.burst(pos, { count: p.kind === 'gold' ? 30 : 16, colors: [COL[p.kind], 0xffffff], speed: 2.6, up: 1, size: 0.03, life: 0.6, gravity: 4 });
      ctx.popup((wrongHand ? 'Other hand! ' : '') + '+' + pts, pos.clone().add(V(0, 0.25, 0)), p.kind === 'gold' ? '#ffc93c' : '#ffffff');
      ctx.sfx('hit'); ctx.shake(0.08);
      if (combo && combo % 10 === 0) { hud.toast(`${combo} COMBO!`, 800); ctx.sfx('cheer'); }
    }
    hud.info(VR ? 'Blue pads = left fist · red = right · gold = either' : 'Click pads fast · blue/red/gold · combos multiply points');

    return {
      onPress() {
        if (VR || over) return;
        let bestP = null, bd = 0.19;
        pads.forEach((p) => { const d = input.ray.distanceToPoint(p.g.position); if (d < bd) { bd = d; bestP = p; } });
        const g = bestP ? (bestP.g.position.x < 0 ? gL : gR) : (nextGlove++ % 2 ? gL : gR);
        const to = bestP ? bestP.g.position.clone().add(V(0, 0, 0.08)) : ctx.rayPlane(V(0, 0, 1), V(0, 0, -0.2)) || V(0, FY + 1.4, -0.2);
        punch = { g, rest: g === gL ? restL : restR, to, t: 0 };
        ctx.sfx('whoosh');
        if (bestP) hitPad(bestP, false); else { combo = 0; }
      },
      update(dt) {
        if (!over) {
          time -= dt;
          hud.info(`⏱ ${Math.max(0, time).toFixed(1)} s · combo ×${combo} · ${VR ? 'blue = left, red = right' : 'click fast!'}`);
          if (time <= 0) { over = true; pads.slice().forEach(removePad); ctx.finish(score, `${hits} pads · best combo ${best}`); }
          spawnT -= dt;
          if (spawnT <= 0 && !over) { spawn(); if (time < 25 && Math.random() < 0.35) spawn(); spawnT = Math.max(0.42, 0.9 - (45 - time) * 0.012); }
        }
        // gloves
        if (VR) {
          const hs = ctx.hands();
          const left = hs.find((h) => h.handed === 'left') || hs[0], right = hs.find((h) => h.handed === 'right') || hs[1];
          [[gL, left], [gR, right]].forEach(([g, h]) => { g.position.copy(h.pos); g.quaternion.copy(h.quat); });
          for (const h of hs) {
            if (h.vel.length() < 1.3) continue;
            for (const p of pads.slice()) {
              if (h.pos.distanceTo(p.g.position) < 0.17) {
                const wrong = p.kind !== 'gold' && h.handed && h.handed !== p.kind;
                hitPad(p, wrong); ctx.buzz(0.9, 60, h.obj);
              }
            }
          }
        } else {
          [[gL, restL], [gR, restR]].forEach(([g, rest]) => { if (!punch || punch.g !== g) g.position.lerp(rest, Math.min(1, dt * 12)); });
          if (punch) {
            punch.t += dt; const k = punch.t < 0.07 ? punch.t / 0.07 : Math.max(0, 1 - (punch.t - 0.07) / 0.15);
            punch.g.position.lerpVectors(punch.rest, punch.to, k);
            if (punch.t > 0.22) punch = null;
          }
          gL.lookAt(gL.position.clone().add(V(0.05, 0, -1))); gR.lookAt(gR.position.clone().add(V(-0.05, 0, -1)));
        }
        // pad lifetimes
        for (const p of pads.slice()) {
          p.age += dt;
          const k = p.age / p.life;
          p.timer.scale.setScalar(1.6 - k * 0.95);
          p.g.scale.setScalar(Math.min(1, p.age * 8));
          if (k >= 1) { removePad(p); combo = 0; ctx.fx.dust(p.g.position.clone(), 6, COL[p.kind]); }
        }
      },
    };
  },
};

// ============ BEACH DARTS ============
const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
function boardTexture() {
  const S = 1024, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'), C = S / 2, k = (S / 2) / 225;
  g.fillStyle = '#1b1b1b'; g.beginPath(); g.arc(C, C, 225 * k, 0, Math.PI * 2); g.fill();
  const ring = (r0, r1, colA, colB) => {
    for (let i = 0; i < 20; i++) {
      const a0 = -Math.PI / 2 + (i - 0.5) * (Math.PI / 10), a1 = a0 + Math.PI / 10;
      g.fillStyle = i % 2 ? colB : colA; g.beginPath(); g.arc(C, C, r1 * k, a0, a1); g.arc(C, C, r0 * k, a1, a0, true); g.closePath(); g.fill();
    }
  };
  ring(107, 162, '#1b1b1b', '#f4e7c8'); ring(99, 107, '#d8352a', '#1f8a4a'); ring(15.9, 99, '#1b1b1b', '#f4e7c8'); ring(162, 170, '#d8352a', '#1f8a4a');
  g.fillStyle = '#1f8a4a'; g.beginPath(); g.arc(C, C, 15.9 * k, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#d8352a'; g.beginPath(); g.arc(C, C, 6.35 * k, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#c0c0c0'; g.lineWidth = 2;
  for (const r of [6.35, 15.9, 99, 107, 162, 170]) { g.beginPath(); g.arc(C, C, r * k, 0, Math.PI * 2); g.stroke(); }
  g.fillStyle = '#ffffff'; g.font = `bold ${Math.round(34 * k)}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  ORDER.forEach((n, i) => { const a = -Math.PI / 2 + i * (Math.PI / 10); g.fillText(String(n), C + Math.cos(a) * 196 * k, C + Math.sin(a) * 196 * k); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function scoreDart(dx, dy) {
  const r = Math.hypot(dx, dy) * 1000;
  if (r < 6.35) return { pts: 50, label: 'BULLSEYE' };
  if (r < 15.9) return { pts: 25, label: 'Bull 25' };
  if (r > 170) return { pts: 0, label: 'Missed the board' };
  const a = ((Math.atan2(dx, dy) * 180) / Math.PI + 360 + 9) % 360;
  const n = ORDER[Math.floor(a / 18) % 20];
  if (r >= 99 && r <= 107) return { pts: n * 3, label: 'Treble ' + n };
  if (r >= 162) return { pts: n * 2, label: 'Double ' + n };
  return { pts: n, label: String(n) };
}
const darts = {
  id: 'darts', name: 'Beach Darts', emoji: '🎯', blurb: 'Nine darts at the beach bar. Trebles, doubles and the bull.',
  how: 'Aim the swaying reticle · hold & release on the marker · too soft drops low, too hard flies high',
  create(ctx) {
    const { root, mesh, hud, input, tex, camera } = ctx;
    const VR = ctx.vr, BZ = -2.37, BY = 1.73;
    const deck = mesh(new THREE.BoxGeometry(6, 0.1, 6), 0xffffff, { mat: { map: tex.wood('#b88550', 10, [1, 1], 55) } }); deck.position.set(0, -0.04, -1); root.add(deck);
    const wall = mesh(new THREE.BoxGeometry(5, 3.2, 0.2), 0xffffff, { mat: { map: tex.wood('#8a5a35', 9, [1, 1], 66) } }); wall.position.set(0, 1.6, BZ - 0.14); root.add(wall);
    const roof = mesh(new THREE.BoxGeometry(5.6, 0.25, 2.2), 0xffffff, { rough: 1, mat: { map: tex.thatch() } }); roof.position.set(0, 3.3, BZ + 0.8); roof.rotation.x = 0.18; root.add(roof);
    const sign = mesh(new THREE.BoxGeometry(2.6, 0.5, 0.06), 0xffffff, { mat: { map: tex.label('WIDR BAR'), emissive: 0xffffff, emissiveIntensity: 0.2 } }); sign.position.set(0, 2.75, BZ - 0.02); root.add(sign);
    const cab = mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.05, 48), 0x1b2026); cab.rotation.x = Math.PI / 2; cab.position.set(0, BY, BZ - 0.03); root.add(cab);
    const board = mesh(new THREE.CircleGeometry(0.225, 64), 0xffffff, { rough: 0.85, cast: false, mat: { map: boardTexture() } }); board.position.set(0, BY, BZ); root.add(board);
    const oche = mesh(new THREE.BoxGeometry(0.8, 0.02, 0.05), 0xffc93c, { cast: false }); oche.position.set(0, 0.02, 0); root.add(oche);
    for (const s of [-1, 1]) {
      const torch = mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.8, 8), 0x7a5230); torch.position.set(s * 2.1, 0.9, BZ + 0.3); root.add(torch);
      const flame = mesh(new THREE.ConeGeometry(0.1, 0.3, 10), 0xff8a3a, { cast: false, mat: { emissive: 0xff6a1a, emissiveIntensity: 2 } }); flame.position.set(s * 2.1, 1.95, BZ + 0.3); root.add(flame);
      const stool = mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.08, 16), 0xe8403a); stool.position.set(s * 1.6, 0.7, -0.6); root.add(stool);
      const leg = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6), 0x26313a, { metal: 0.6 }); leg.position.set(s * 1.6, 0.35, -0.6); root.add(leg);
    }
    if (VR) { ctx.setView(V(0, 1.65, 0.1), V(0, BY, BZ)); ctx.laser(false); }
    else { ctx.setView(V(0, 1.66, 0.3), V(0, BY, BZ)); camera.fov = 42; camera.updateProjectionMatrix(); }

    function makeDart() {
      const g = new THREE.Group();
      const barrel = mesh(new THREE.CylinderGeometry(0.0065, 0.0055, 0.055, 10), 0xc8d0d6, { metal: 0.9, rough: 0.25 }); barrel.rotation.x = Math.PI / 2; g.add(barrel);
      const tip = mesh(new THREE.ConeGeometry(0.0025, 0.035, 6), 0xdddddd, { metal: 0.9 }); tip.rotation.x = Math.PI / 2; tip.position.z = 0.045; g.add(tip);
      const shaft = mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.045, 6), 0x123247); shaft.rotation.x = Math.PI / 2; shaft.position.z = -0.05; g.add(shaft);
      for (let k = 0; k < 2; k++) { const f = mesh(new THREE.PlaneGeometry(0.03, 0.035), [0xff6b4f, 0x13a9c2, 0xffc93c][thrown % 3], { mat: { side: THREE.DoubleSide } }); f.position.z = -0.075; f.rotation.set(Math.PI / 2, k * Math.PI / 2, 0); g.add(f); }
      root.add(g); return g;
    }
    // reticle drawn on the board itself (desktop)
    const ret = new THREE.Mesh(new THREE.RingGeometry(0.012, 0.018, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthTest: false }));
    ret.renderOrder = 997; ret.visible = !VR; root.add(ret);
    const aim = V(0, BY, BZ);

    let thrown = 0, total = 0, roundPts = 0, state = 'aim', fly = null, wait = 0, held = null;
    const stuck = [];
    const info = () => hud.info(`Round ${Math.floor(thrown / 3) + 1}/3 · dart ${(thrown % 3) + 1}/3 · round ${roundPts}${VR ? ' · trigger to pick up, throw & let go' : ''}`);
    info();
    function land(p) {
      const r = scoreDart(p.x, p.y - BY);
      total += r.pts; roundPts += r.pts; hud.score(total);
      ctx.popup(r.pts ? `${r.label} · ${r.pts}` : r.label, p.clone().add(V(0, 0.12, 0.1)), r.pts >= 40 ? '#ffc93c' : '#ffffff');
      ctx.sfx(r.pts >= 50 || r.label.startsWith('Treble 20') ? 'cheer' : r.pts ? 'hit' : 'miss');
      if (r.pts >= 50) ctx.fx.confetti(V(0, BY + 0.6, BZ + 0.6), 80);
      ctx.fx.burst(p.clone(), { count: 6, colors: [0xffffff], speed: 0.6, up: 0.3, size: 0.008, life: 0.4, gravity: 3 });
      thrown++; state = 'wait'; wait = thrown % 3 === 0 ? 1.6 : 0.5;
      if (thrown % 3 === 0) hud.toast(`Round: ${roundPts}`, 1200);
    }

    return {
      onPress() { if (VR && state === 'aim' && !held) { held = makeDart(); ctx.buzz(0.3, 30); } },
      onRelease() {
        if (state !== 'aim') return;
        if (VR) {
          if (!held) return;
          const h = ctx.hand();
          if (h.vel.length() < 1.4) { hud.toast('Throw it!', 600); return; }
          fly = { m: held, p: held.position.clone(), v: h.vel.clone().multiplyScalar(1.15), vr: true }; held = null;
          state = 'fly'; ctx.sfx('whoosh'); ctx.buzz(0.4, 30); return;
        }
        const pw = input.lastCharge; if (pw < 0.05) return;
        const target = aim.clone().add(V(rnd(-0.004, 0.004), (pw - 0.62) * 0.42 + rnd(-0.004, 0.004), 0)); target.z = BZ + 0.005;
        const from = camera.getWorldPosition(V()).add(V(0.12, -0.18, -0.15));
        fly = { m: makeDart(), from, target, u: 0 };
        state = 'fly'; hud.power(null); ctx.sfx('whoosh');
      },
      update(dt, t) {
        if (!VR) {
          const hit = ctx.rayPlane(V(0, 0, 1), V(0, 0, BZ + 0.004));
          if (hit) aim.copy(hit).add(V(Math.sin(t * 1.7) * 0.014 + Math.sin(t * 3.1) * 0.006, Math.cos(t * 1.3) * 0.012 + Math.sin(t * 2.3) * 0.005, 0));
          ret.position.copy(aim); ret.visible = state === 'aim';
          if (state === 'aim') hud.power(input.down ? input.charge() : null, 0.62);
        }
        if (held) { const h = ctx.hand(); held.position.copy(h.pos).addScaledVector(h.dir, 0.06); held.lookAt(held.position.clone().add(h.dir)); }
        if (state === 'fly' && fly) {
          if (fly.vr) {
            const prev = fly.p.clone();
            fly.v.y -= 9.8 * dt; fly.p.addScaledVector(fly.v, dt);
            fly.m.position.copy(fly.p); fly.m.lookAt(fly.p.clone().add(fly.v));
            if (prev.z > BZ + 0.01 && fly.p.z <= BZ + 0.01) {
              const k = (prev.z - (BZ + 0.01)) / (prev.z - fly.p.z), hp = prev.lerp(fly.p, k);
              fly.m.position.copy(hp); stuck.push(fly.m); fly = null; land(hp); ctx.buzz(0.6, 40);
            } else if (fly.p.y < 0 || fly.p.z < BZ - 1) { fly.p.y = Math.max(0.02, fly.p.y); fly.m.position.copy(fly.p); stuck.push(fly.m); fly = null; land(V(9, 9, BZ)); }
          } else {
            fly.u = Math.min(1, fly.u + dt / 0.28);
            const p = fly.from.clone().lerp(fly.target, fly.u); p.y += Math.sin(fly.u * Math.PI) * 0.06;
            const ahead = fly.from.clone().lerp(fly.target, Math.min(1, fly.u + 0.05)); ahead.y += Math.sin(Math.min(1, fly.u + 0.05) * Math.PI) * 0.06;
            fly.m.position.copy(p); if (fly.u < 1) fly.m.lookAt(ahead);
            if (fly.u >= 1) { stuck.push(fly.m); const tp = fly.target.clone(); fly = null; land(tp); }
          }
        } else if (state === 'wait') {
          wait -= dt;
          if (wait <= 0) {
            if (thrown >= 9) { state = 'over'; ctx.finish(total, 'Max is 540 (nine treble 20s).'); return; }
            if (thrown % 3 === 0) { stuck.splice(0).forEach((d) => { root.remove(d); d.traverse((n) => { n.geometry?.dispose(); n.material?.dispose(); }); }); roundPts = 0; }
            state = 'aim'; info();
          }
        }
      },
      dispose() { camera.fov = 60; camera.updateProjectionMatrix(); },
    };
  },
};

export const SPORTS_E = [boxing, darts];
