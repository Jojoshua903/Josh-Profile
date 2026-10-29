import { THREE, scene, toon, addOutline, V3, puff, toast, label } from './core.js?v=sub1';
import { addCookie } from './cookies.js?v=sub1';
import * as sfx from './sfx.js?v=sub1';

// Sub-areas: on every planet there's a door (a hatch, a cave, a pipe, a gong…) to a little level of its own,
// floating far away in the sky. One challenge, one cosmic cookie at the end, then an exit back.
//   parkour – a hard jumping course: moving, crumbling, bouncing and spinning bits
//   race    – the same, against the clock (the clock starts when you leave the start)
//   escape  – something rises up from below (lava, water, a storm…). Stay ahead of it!
// Falling, or getting caught, puts you back at the start. No hearts lost.
const SUBS = {
  mistmaan: { name: 'De Kratertrap', door: 'luik', type: 'parkour', flag: 0, seed: 3, mix: ['plat', 'move', 'plat', 'move', 'crumble'], n: 11, col: [0xb8c0d8, 0x8a90a8], hz: 0x9ad8ff },
  berg: { name: 'De Ijsgrot', door: 'grot', type: 'race', flag: 2, seed: 11, mix: ['crumble', 'plat', 'crumble', 'move'], n: 12, col: [0xe8f4ff, 0x9ac8e8], hz: 0x9ad8ff },
  bos: { name: 'Het Sporentorentje', door: 'paddo', type: 'parkour', flag: 2, seed: 7, mix: ['bounce', 'plat', 'move', 'plat', 'spin'], n: 11, col: [0xff7ab6, 0x8a4a8a], hz: 0xb6e36b },
  schroot: { name: 'De Persmachine', door: 'buis', type: 'escape', flag: 2, seed: 5, mix: ['plat', 'spin', 'move', 'plat', 'crumble'], n: 14, col: [0xc8a070, 0x6a5a4a], hz: 0x8a8a9a, hzName: 'de pers' },
  zon: { name: 'De Lavaschacht', door: 'vent', type: 'escape', flag: 2, seed: 9, mix: ['plat', 'crumble', 'move', 'plat'], n: 14, col: [0xffc070, 0xc84a2a], hz: 0xff5a1a, hzName: 'de lava' },
  water: { name: 'De Duikklok', door: 'klok', type: 'parkour', flag: 2, seed: 13, mix: ['move', 'plat', 'move', 'crumble', 'move'], n: 11, col: [0xd8f4ff, 0x5ac8f0], hz: 0x3a8ab8 },
  tempel: { name: 'De Vallende Vloer', door: 'poort', type: 'race', flag: 3, seed: 17, mix: ['crumble', 'crumble', 'plat', 'spin'], n: 12, col: [0xd8b080, 0x8a6a4a], hz: 0xffe14a },
  feest: { name: 'Het Trommelparcours', door: 'cadeau', type: 'parkour', flag: 2, seed: 19, mix: ['bounce', 'move', 'plat', 'spin', 'bounce'], n: 11, col: [0xffd166, 0xe0443a], hz: 0xff9ad8 },
  regen: { name: 'De Neonsprint', door: 'put', type: 'race', flag: 2, seed: 23, mix: ['move', 'plat', 'move', 'crumble'], n: 13, col: [0xff4ad8, 0x4ad8ff], hz: 0xff4ad8 },
  wolk: { name: 'De Stormtrap', door: 'wolk', type: 'escape', flag: 4, seed: 29, mix: ['plat', 'move', 'bounce', 'crumble', 'plat'], n: 14, col: [0xffffff, 0xb8c8ff], hz: 0x5a5a78, hzName: 'de storm' },
};

export const hasSub = (planet) => !!SUBS[planet];
export function setupSubs({ PLANET, boxes, movers, groundAt, CHECKPOINTS, P, hurt, resetCam }) {
  const C = SUBS[PLANET];
  if (!C) return { near: () => false, prompt: () => '', enter() {}, update() {}, active: () => false };
  const BASE = V3(1000, 220, 1000);
  let rs = C.seed * 9301 + 49297;
  const rnd = () => ((rs = (rs * 16807) % 2147483647) / 2147483647);
  const [colA, colB] = C.col;
  const root = new THREE.Group(); scene.add(root);
  const pieces = [], ys = [];

  // ---------- building blocks ----------
  function plat(x, y, z, w = 3, d = 3, col = colA, extra = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.6, d), [toon(colB), toon(colB), toon(col), toon(colB), toon(colB), toon(colB)]);
    m.position.set(x, y - 0.3, z); m.castShadow = m.receiveShadow = true; addOutline(m, 1.03); root.add(m);
    const b = { pos: m.position, half: V3(w / 2, 0.3, d / 2), min: V3(), max: V3(), mesh: m, ...extra };
    sync(b); boxes.push(b);
    return b;
  }
  const sync = (b) => { b.min.copy(b.pos).sub(b.half); b.max.copy(b.pos).add(b.half); };
  // where the course goes: a walk that turns a little and climbs, with gaps you can jump
  const start = BASE.clone();
  plat(start.x, start.y, start.z, 6, 6);
  const exitStart = door(start.clone().add(V3(-2, 0, -2)), true);
  let p = start.clone(), dir = 0, lastY = start.y;
  let goal = null;
  for (let i = 0; i < C.n; i++) {
    let kind = C.mix[i % C.mix.length];
    if (i === 0 && kind === 'crumble') kind = 'plat';
    const gap = kind === 'move' ? 4.4 + rnd() * 0.8 : 3 + rnd() * 1.4;
    dir += (rnd() - 0.5) * 1.1;
    const prevHalf = 1.5;
    const step = prevHalf + gap + 1.5;
    p = p.clone().add(V3(Math.sin(dir) * step, 0, Math.cos(dir) * step));
    p.y = lastY + (C.type === 'escape' ? 0.9 + rnd() * 0.7 : (rnd() - 0.35) * 1.8);
    if (kind === 'plat') plat(p.x, p.y, p.z);
    else if (kind === 'crumble') crumble(p.x, p.y, p.z);
    else if (kind === 'move') mover(p.x, p.y, p.z, dir, i);
    else if (kind === 'bounce') { plat(p.x, p.y, p.z, 3, 3); bouncePad(p.x, p.y, p.z); lastY = p.y + 6; p.y = lastY - 6; dir += 0.2; i++; const q = p.clone().add(V3(Math.sin(dir) * 4.5, 0, Math.cos(dir) * 4.5)); q.y = p.y + 6.2; plat(q.x, q.y, q.z, 3.4, 3.4); ys.push(p.y, q.y); p = q; lastY = q.y; continue; }
    else if (kind === 'spin') { plat(p.x, p.y, p.z, 6.5, 6.5); spinner(p.x, p.y, p.z, i); p = p.clone().add(V3(Math.sin(dir) * 1.6, 0, Math.cos(dir) * 1.6)); }
    lastY = p.y; ys.push(p.y);
  }
  {
    const f = V3(Math.sin(dir), 0, Math.cos(dir));
    goal = p.clone().addScaledVector(f, 7.5); goal.y = lastY + 0.5;
    plat(goal.x, goal.y, goal.z, 5, 5, colA);
  }
  const lowest = Math.min(start.y, ...ys) - 9;
  const cookieName = `${C.name}`;
  addCookie(goal.x, goal.y + 1.3, goal.z, cookieName);
  const exitGoal = door(goal.clone().add(V3(1.6, 0, 1.6)), true);
  const lamp = new THREE.PointLight(C.hz, 6, 14, 2); lamp.position.copy(goal).add(V3(0, 3, 0)); root.add(lamp);
  label(C.name, start.x, start.y + 3.6, start.z + 2.5, 4);
  // some drifting chunks round the course, so it doesn't float in nothing at all
  for (let i = 0; i < 26; i++) {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6 + rnd() * 1.6), toon(rnd() < 0.5 ? colA : colB));
    const a = rnd() * Math.PI * 2, r = 14 + rnd() * 30;
    m.position.set((start.x + goal.x) / 2 + Math.cos(a) * r, start.y - 6 + rnd() * 24, (start.z + goal.z) / 2 + Math.sin(a) * r); root.add(m);
  }

  function crumble(x, y, z) {
    const b = plat(x, y, z, 2.8, 2.8, 0xd8b8a0);
    for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 1.6), new THREE.MeshBasicMaterial({ color: 0x3a2a20 })); c.position.set((k - 1) * 0.7, 0.31, 0); c.rotation.y = k * 0.7; b.mesh.add(c); }
    const q = { kind: 'crumble', b, y, home: b.pos.clone(), t: -1, gone: false };
    b.onLand = () => { if (q.t < 0) { q.t = 0; sfx.crate(); } };
    pieces.push(q);
  }
  function mover(x, y, z, d, i) {
    const b = plat(x, y, z, 2.8, 2.8, colA);
    const side = V3(Math.cos(d), 0, -Math.sin(d)), home = V3(x, y - 0.3, z), amp = 1.8 + rnd(), sp = 0.9 + rnd() * 0.5, ph = i * 1.3;
    const up = rnd() < 0.3;
    b.mover = { b, delta: V3(), fn(t) { const s = Math.sin(t * sp + ph) * amp; return up ? home.clone().add(V3(0, s * 0.8, 0)) : home.clone().addScaledVector(side, s); } };
    movers.push(b.mover);
    pieces.push({ kind: 'move', y });
  }
  function bouncePad(x, y, z) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1, 0.3, 16), toon(0xff7ab6)); m.position.set(x, y + 0.15, z); addOutline(m, 1.05); root.add(m);
    const b = { pos: m.position, half: V3(0.9, 0.15, 0.9), min: V3(), max: V3(), mesh: m, bounce: 21 }; sync(b); boxes.push(b);
    pieces.push({ kind: 'bounce', y });
  }
  function spinner(x, y, z, i) {
    const g = new THREE.Group(); g.position.set(x, y + 0.55, z); root.add(g);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 6, 10), new THREE.MeshBasicMaterial({ color: C.hz })); bar.rotation.z = Math.PI / 2; addOutline(bar, 1.15); g.add(bar);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.8, 12), toon(colB)); g.add(hub);
    pieces.push({ kind: 'spin', g, y, sp: (i % 2 ? 1 : -1) * (1.6 + rnd() * 0.6) });
  }
  // ---------- the hazard that rises (escape) ----------
  const flood = new THREE.Mesh(new THREE.BoxGeometry(160, 1, 160), new THREE.MeshBasicMaterial({ color: C.hz, transparent: true, opacity: 0.8 }));
  flood.visible = C.type === 'escape'; root.add(flood);
  const FLOOD_FROM = start.y - 7, FLOOD_SPEED = 0.42;
  // ---------- doors ----------
  function door(at, isExit) {
    const g = new THREE.Group(); g.position.copy(at); (isExit ? root : scene).add(g);
    const ink = new THREE.MeshBasicMaterial({ color: 0x1a1030 });
    const glow = new THREE.MeshBasicMaterial({ color: isExit ? 0x7aff9a : C.hz, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
    const mk = (geo, mat, x, y, z, ol = 1.06) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; if (ol) addOutline(m, ol); g.add(m); return m; };
    const style = isExit ? 'exit' : C.door;
    if (style === 'exit') { const r = mk(new THREE.TorusGeometry(0.9, 0.12, 8, 24), glow, 0, 1.2, 0, 0); mk(new THREE.CircleGeometry(0.85, 24), new THREE.MeshBasicMaterial({ color: 0x7aff9a, transparent: true, opacity: 0.35, side: THREE.DoubleSide }), 0, 1.2, 0, 0); g.userData.spin = r; }
    else if (style === 'luik' || style === 'put') { mk(new THREE.CylinderGeometry(1, 1, 0.15, 20), toon(style === 'put' ? 0x5a5a6a : 0x8a90a8), 0, 0.08, 0); mk(new THREE.TorusGeometry(0.75, 0.08, 6, 20), glow, 0, 0.18, 0, 0).rotation.x = Math.PI / 2; }
    else if (style === 'grot') { for (const s of [-1, 1]) mk(new THREE.DodecahedronGeometry(0.9), toon(0x8a8a9a), 1 * s, 0.8, 0); mk(new THREE.DodecahedronGeometry(1.1), toon(0x9a9aaa), 0, 2, 0); mk(new THREE.PlaneGeometry(1.2, 1.5), ink, 0, 0.75, 0.3, 0); }
    else if (style === 'paddo') { mk(new THREE.CylinderGeometry(0.6, 0.8, 1.8, 14), toon(0xf4ecd8), 0, 0.9, 0); mk(new THREE.SphereGeometry(1.4, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xff7ab6), 0, 1.7, 0); mk(new THREE.PlaneGeometry(0.6, 1), ink, 0, 0.55, 0.78, 0); }
    else if (style === 'buis') { const t = mk(new THREE.CylinderGeometry(0.9, 0.9, 1.2, 16, 1, true), toon(0x7a9a5a), 0, 0.6, 0); t.material.side = THREE.DoubleSide; mk(new THREE.TorusGeometry(0.95, 0.15, 8, 20), toon(0x5a7a3a), 0, 1.2, 0).rotation.x = Math.PI / 2; mk(new THREE.CircleGeometry(0.85, 20), ink, 0, 1.05, 0, 0).rotation.x = -Math.PI / 2; }
    else if (style === 'vent') { mk(new THREE.ConeGeometry(1.2, 1.2, 8), toon(0x8a3a2a), 0, 0.6, 0); mk(new THREE.CircleGeometry(0.5, 12), glow, 0, 1.22, 0, 0).rotation.x = -Math.PI / 2; g.userData.smoke = true; }
    else if (style === 'klok') { mk(new THREE.SphereGeometry(1.1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xc8a040), 0, 0.6, 0); mk(new THREE.CircleGeometry(0.35, 14), new THREE.MeshBasicMaterial({ color: 0x9ad8ff }), 0, 1.1, 0.95, 0); mk(new THREE.CylinderGeometry(1.15, 1.15, 0.6, 16), toon(0xa88a30), 0, 0.3, 0); }
    else if (style === 'poort') { for (const s of [-1, 1]) mk(new THREE.BoxGeometry(0.5, 2.4, 0.5), toon(0xd8b080), 0.9 * s, 1.2, 0); mk(new THREE.BoxGeometry(2.6, 0.5, 0.7), toon(0xb89060), 0, 2.6, 0); mk(new THREE.PlaneGeometry(1.3, 2.2), glow, 0, 1.1, 0, 0); }
    else if (style === 'cadeau') { mk(new THREE.BoxGeometry(1.6, 1.4, 1.6), toon(0xe0443a), 0, 0.7, 0); mk(new THREE.BoxGeometry(1.65, 0.25, 0.3), toon(0xffd166), 0, 1.42, 0, 0); mk(new THREE.BoxGeometry(0.3, 0.25, 1.65), toon(0xffd166), 0, 1.42, 0, 0); mk(new THREE.TorusGeometry(0.3, 0.1, 6, 12), toon(0xffd166), 0, 1.65, 0, 0); }
    else if (style === 'wolk') { for (let k = 0; k < 5; k++) mk(new THREE.SphereGeometry(0.6 + (k % 2) * 0.2, 10, 8), toon(0xffffff), (k - 2) * 0.5, 1.6 + (k % 2) * 0.4, 0); for (const s of [-1, 1]) mk(new THREE.SphereGeometry(0.6, 10, 8), toon(0xffffff), 1.1 * s, 0.6, 0); mk(new THREE.PlaneGeometry(1.2, 1.6), glow, 0, 0.9, 0.05, 0); }
    if (!isExit) { const l = new THREE.PointLight(C.hz, 4, 6, 2); l.position.y = 1.6; g.add(l); }
    return g;
  }
  // the door on the planet: next to one of its flags, on flat ground
  let doorAt = null;
  {
    const cp = CHECKPOINTS[Math.min(C.flag, CHECKPOINTS.length - 1)];
    const f = cp.pos, fy = groundAt(f.x, f.z, 0.3);
    for (let k = 0; k < 16 && !doorAt; k++) {
      const a = (k / 16) * Math.PI * 2 + 0.4, r = k < 8 ? 3.2 : 4.6;
      const x = f.x + Math.cos(a) * r, z = f.z + Math.sin(a) * r, g = groundAt(x, z, 1.2);
      const clear = !boxes.some((b) => x > b.min.x - 1.4 && x < b.max.x + 1.4 && z > b.min.z - 1.4 && z < b.max.z + 1.4 && b.max.y > g + 0.2 && b.min.y < g + 3);
      if (Math.abs(g - fy) < 0.3 && Math.abs(groundAt(x, z, 0) - g) < 0.05 && clear) doorAt = V3(x, g, z);
    }
    if (!doorAt) doorAt = V3(f.x + 2.5, fy, f.z);
  }
  const entry = door(doorAt, false);
  const sign = label(`${C.name}`, doorAt.x, doorAt.y + 3.4, doorAt.z, 3.4);

  // ---------- the HUD timer ----------
  let hud = document.getElementById('subHud');
  if (!hud) {
    hud = document.createElement('div'); hud.id = 'subHud';
    hud.style.cssText = 'position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:6;display:none;padding:6px 18px;border-radius:16px;background:#fff8ec;border:4px solid #2b2440;font:800 22px ui-rounded,system-ui,sans-serif;color:#2b2440';
    document.body.appendChild(hud);
  }
  const fade = document.createElement('div');
  fade.style.cssText = 'position:fixed;inset:0;background:#fff8ec;opacity:0;pointer-events:none;transition:opacity .25s;z-index:25';
  document.body.appendChild(fade);

  // ---------- state ----------
  const S = { on: false, back: null, t: 0, run: false, flood: FLOOD_FROM, busy: false };
  const LIMIT = Math.round(C.n * 2.2 + 8);
  function reset(msg) {
    P.pos.copy(start).add(V3(1, 0.1, 1)); P.vel.set(0, 0, 0); P.pound = 0; P.long = false;
    S.run = false; S.t = 0; S.flood = FLOOD_FROM;
    for (const q of pieces) if (q.kind === 'crumble') { q.t = -1; if (q.gone) { boxes.push(q.b); q.gone = false; } q.b.pos.copy(q.home); sync(q.b); q.b.mesh.visible = true; q.b.mesh.rotation.set(0, 0, 0); }
    resetCam(); if (msg) toast(msg);
  }
  function go(fn) { if (S.busy) return; S.busy = true; fade.style.opacity = 1; setTimeout(() => { fn(); fade.style.opacity = 0; S.busy = false; }, 280); sfx.whir(); }
  function enter() {
    go(() => {
      S.on = true; S.back = P.pos.clone(); reset();
      const how = C.type === 'race' ? `Haal het einde binnen ${LIMIT} seconden!` : C.type === 'escape' ? `Klim omhoog, voor ${C.hzName || 'het'} je inhaalt!` : 'Kom heelhuids aan de overkant!';
      toast(`${C.name}: ${how}`);
    });
  }
  function leave() { go(() => { S.on = false; hud.style.display = 'none'; P.pos.copy(S.back).add(V3(0.6, 0.2, 0.6)); P.vel.set(0, 0, 0); resetCam(); }); }

  function update(dt, t) {
    entry.visible = true;
    if (entry.userData.smoke && Math.random() < dt * 6) puff(entry.position.clone().add(V3(0, 1.4, 0)), 1, 0x9a948a, 0.5, 2);
    for (const e of [exitStart, exitGoal]) if (e.userData.spin) e.userData.spin.rotation.z = t * 2;
    flood.visible = S.on && C.type === 'escape';
    if (!S.on) { hud.style.display = 'none'; return; }
    // knocked back to the planet's checkpoint (out of hearts): we're not in here any more
    if (P.pos.distanceTo(start) > 260) { S.on = false; hud.style.display = 'none'; return; }
    const p = P.pos;
    // the clock starts when you leave the start
    if (!S.run && Math.hypot(p.x - start.x, p.z - start.z) > 3.4) S.run = true;
    if (S.run) S.t += dt;
    // pieces
    for (const q of pieces) {
      if (q.kind === 'spin') {
        q.g.rotation.y += q.sp * dt;
        const a = q.g.rotation.y, lx = p.x - q.g.position.x, lz = p.z - q.g.position.z;
        const along = lx * Math.cos(a) - lz * Math.sin(a), off = lx * Math.sin(a) + lz * Math.cos(a);
        if (Math.abs(along) < 3.1 && Math.abs(off) < 0.6 && p.y < q.g.position.y + 0.5 && p.y > q.g.position.y - 1.2) hurt(q.g.position.clone());
      } else if (q.kind === 'crumble' && q.t >= 0) {
        q.t += dt;
        q.b.mesh.rotation.z = q.t < 0.55 ? Math.sin(q.t * 60) * 0.04 : 0;
        if (q.t > 0.55 && !q.gone) { q.gone = true; const i = boxes.indexOf(q.b); if (i >= 0) boxes.splice(i, 1); puff(q.b.pos.clone(), 10, 0xd8b8a0, 3, 1); }
        if (q.gone) { q.b.pos.y -= dt * 12; q.b.mesh.rotation.x += dt * 2; }
        if (q.t > 3.2) { q.t = -1; q.gone = false; boxes.push(q.b); q.b.pos.copy(q.home); sync(q.b); q.b.mesh.rotation.set(0, 0, 0); }
        else sync(q.b);
      }
    }
    // the rising hazard
    if (C.type === 'escape') {
      if (S.run) S.flood += FLOOD_SPEED * dt * (1 + S.t / 40);
      flood.position.set(p.x, S.flood - 0.5, p.z);
      flood.material.opacity = 0.75 + Math.sin(t * 3) * 0.08;
      if (Math.random() < 0.5) puff(V3(p.x + (Math.random() - 0.5) * 16, S.flood, p.z + (Math.random() - 0.5) * 16), 1, C.hz, 1, 2);
      if (p.y < S.flood + 0.1) { sfx.hurt(); reset(`${(C.hzName || 'Het')[0].toUpperCase() + (C.hzName || 'het').slice(1)} heeft je ingehaald! Nog een keer.`); return; }
    }
    if (C.type === 'race' && S.run && S.t > LIMIT) { sfx.hurt(); reset('De tijd is op! Nog een keer.'); return; }
    if (p.y < lowest) { sfx.hurt(); reset('Gevallen! Terug naar het begin.'); return; }
    // HUD
    hud.style.display = 'block';
    hud.textContent = C.type === 'race' ? `⏱ ${Math.max(0, LIMIT - S.t).toFixed(1)}` : C.type === 'escape' ? `${C.name} · ${Math.max(0, p.y - S.flood).toFixed(1)} m voorsprong` : C.name;
    hud.style.color = C.type === 'race' && LIMIT - S.t < 5 ? '#e0443a' : '#2b2440';
  }
  const nearDoor = (p) => p.distanceTo(entry.position) < 2.3;
  const nearExit = (p) => S.on && (p.distanceTo(exitStart.position) < 1.8 || p.distanceTo(exitGoal.position) < 1.8);
  return {
    active: () => S.on,
    near: (p) => (!S.on && nearDoor(p)) || nearExit(p),
    prompt: (p) => (nearExit(p) ? 'terug naar de planeet' : `naar binnen: ${C.name}`),
    enter() { if (S.on) leave(); else enter(); },
    update,
  };
  void sign;
}
