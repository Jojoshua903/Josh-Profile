import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { mat, part, joint, ball, pill, tube, cone, ring, slab, dome, live } from './rig.js?v=20261128r';

// Skin looks: every skin adds pieces to the hero's body as well as recolouring it. Crowns,
// horns and visors sit on the head, capes, wings and jetpacks on the back, emblems on the chest,
// and some skins have things orbiting them or an aura at their feet.
// Pieces are placed from the hero's own shape (measured before baking), so one piece fits every
// hero, from the tall knights to the microwave. Moving pieces animate with the hero.
// A look is a list of pieces, each a name or [name, options]:
//   c: colour (defaults to the skin's trim), c2: second colour, glow: how much it lights up,
//   n: how many (orbiters, spikes), s: size, shape: for emblems and orbiters

const TAU = Math.PI * 2;
const lit = (c, glow = 0, o = {}) => mat(c, { rough: o.rough ?? 0.35, metal: o.metal ?? 0.15, glow, ...o });
const clear = new Map();
function glass(c, op = 0.55, glow = 0.5) {
  const k = c + ':' + op + ':' + glow;
  if (!clear.has(k)) clear.set(k, new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: glow, transparent: true, opacity: op, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide }));
  return clear.get(k);
}
const octa = new THREE.OctahedronGeometry(0.06, 0), cube = new THREE.BoxGeometry(0.08, 0.08, 0.08), tetra = new THREE.TetrahedronGeometry(0.07, 0);
const flat = new THREE.CircleGeometry(1, 20);

// ---------- where things go ----------
function measure(P) {
  P.root.updateMatrixWorld(true);
  const hw = P.head.getWorldPosition(new THREE.Vector3()), sw = P.spine.getWorldPosition(new THREE.Vector3());
  const body = new THREE.Box3(), skip = new Set([P.head, P.armL, P.armR]);
  for (const c of P.spine.children) if (!skip.has(c)) body.expandByObject(c);
  let hb = new THREE.Box3().expandByObject(P.head);
  if (hb.isEmpty() || hb.max.y - hb.min.y < 0.12) hb = body.clone();     // no separate head: the top of the body is the head
  const all = new THREE.Box3().expandByObject(P.root);
  return {
    top: hb.max.y - hw.y, front: hb.min.z - hw.z, back: hb.max.z - hw.z, half: Math.max(0.16, Math.min(0.42, (hb.max.x - hb.min.x) / 2)),
    eye: (hb.max.y + hb.min.y) / 2 - hw.y + 0.03,
    bBack: body.max.z - sw.z, bFront: body.min.z - sw.z, bHalf: (body.max.x - body.min.x) / 2,
    chest: body.min.y + (body.max.y - body.min.y) * 0.66 - sw.y, neck: body.max.y - sw.y - 0.02, waist: body.min.y + (body.max.y - body.min.y) * 0.18 - sw.y,
    height: all.max.y, wide: (all.max.x - all.min.x) / 2,
  };
}

// ---------- the pieces ----------
// each gets (anchors, options, colours, measurements) and may return an update (dt, speed, t)
const PIECES = {
  // --- head ---
  crown(A, o, C, m) {
    const g = joint(A.head, 0, m.top - 0.02, 0), r = m.half * 0.72, gold = lit(o.c ?? 0xffc93c, o.glow ?? 0.15, { metal: 0.6, rough: 0.25 });
    part(g, tube(r, r * 0.95, 0.09, 18), gold, 0, 0.04, 0);
    const n = o.n ?? 5;
    for (let i = 0; i < n; i++) { const a = i / n * TAU; part(g, cone(0.045, 0.14, 6), gold, Math.sin(a) * r, 0.15, Math.cos(a) * r); part(g, ball(0.028), lit(o.c2 ?? 0xff4d6a, 0.5), Math.sin(a) * r, 0.23, Math.cos(a) * r); }
    part(g, ball(0.045), lit(o.c2 ?? 0xff4d6a, 0.6), 0, 0.05, -r);
  },
  pixelcrown(A, o, C, m) {
    const g = joint(A.head, 0, m.top - 0.01, 0), r = m.half * 0.7, c = lit(o.c ?? 0xffd23c, o.glow ?? 0.4, { rough: 0.9, metal: 0 });
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; part(g, slab(0.09, 0.09, 0.09), c, Math.sin(a) * r, 0.05, Math.cos(a) * r); if (i % 2 === 0) part(g, slab(0.08, 0.08, 0.08), c, Math.sin(a) * r, 0.14, Math.cos(a) * r); }
  },
  halo(A, o, C, m) {
    const g = joint(A.head, 0, m.top + 0.16, 0);
    part(g, ring(m.half * 0.7, 0.025), lit(o.c ?? 0xfff2a8, o.glow ?? 1.1)).rotation.x = Math.PI / 2;
    return (dt, sp, t) => { g.position.y = m.top + 0.16 + Math.sin(t * 2) * 0.03; g.rotation.y += dt * 0.8; };
  },
  horns(A, o, C, m) {
    const c = lit(o.c ?? 0x2a2230, o.glow ?? 0, { rough: 0.4 }), s = o.s ?? 1;
    for (const x of [-1, 1]) {
      const h = joint(A.head, x * m.half * 0.6, m.top - 0.06, 0);
      h.rotation.z = -x * 0.55; h.rotation.x = 0.25;
      part(h, cone(0.06 * s, 0.26 * s, 8), c, 0, 0.12 * s, 0);
      part(h, cone(0.035 * s, 0.12 * s, 8), c, 0, 0.29 * s, 0.03).rotation.x = 0.5;
    }
  },
  antenna(A, o, C, m) {
    const g = joint(A.head, m.half * 0.3, m.top - 0.03, 0.05), c = lit(o.c ?? C.trim, o.glow ?? 1);
    part(g, tube(0.012, 0.012, 0.3, 6), lit(0x2a2f3c), 0, 0.15, 0);
    const b = joint(g, 0, 0.32, 0); part(b, ball(0.05), c);
    return (dt, sp, t) => { g.rotation.z = Math.sin(t * 4) * 0.15 + sp * 0.02; g.rotation.x = Math.cos(t * 3) * 0.1; };
  },
  ears(A, o, C, m) {
    const c = lit(o.c ?? C.main, 0, { rough: 0.6 }), inner = lit(o.c2 ?? 0xffb3cf, o.glow ?? 0, { rough: 0.6 });
    for (const x of [-1, 1]) {
      const e = joint(A.head, x * m.half * 0.62, m.top - 0.06, 0); e.rotation.z = -x * 0.3;
      part(e, cone(0.08, 0.2, 4), c, 0, 0.09, 0, 1, 1, 0.45); part(e, cone(0.05, 0.13, 4), inner, 0, 0.08, -0.02, 1, 1, 0.3);
    }
  },
  bunny(A, o, C, m) {
    const c = lit(o.c ?? 0xffffff, 0, { rough: 0.7 }), inner = lit(o.c2 ?? 0xffb3cf, 0, { rough: 0.7 }), ears = [];
    for (const x of [-1, 1]) {
      const e = joint(A.head, x * m.half * 0.38, m.top - 0.06, 0.02); e.rotation.z = -x * 0.18;
      part(e, pill(0.055, 0.32), c, 0, 0.2, 0, 1, 1, 0.5); part(e, pill(0.032, 0.24), inner, 0, 0.2, -0.025, 1, 1, 0.3); ears.push(e);
    }
    return (dt, sp, t) => ears.forEach((e, i) => { e.rotation.x = Math.sin(t * 3 + i) * 0.08 + Math.min(1, sp / 6) * 0.35; });
  },
  visor(A, o, C, m) {
    const g = joint(A.head, 0, m.eye, m.front + 0.01);
    part(g, slab(m.half * 1.85, 0.085, 0.05), lit(o.c ?? C.trim, o.glow ?? 1.1, { rough: 0.1 }));
    part(g, slab(m.half * 1.95, 0.12, 0.03), lit(o.c2 ?? 0x1d2340, 0, { rough: 0.3, metal: 0.4 }), 0, 0, 0.03);
  },
  shades(A, o, C, m) {
    const g = joint(A.head, 0, m.eye, m.front - 0.005), c = lit(o.c ?? 0x1d1d24, o.glow ?? 0, { rough: 0.1, metal: 0.5 });
    for (const x of [-1, 1]) part(g, slab(m.half * 0.72, 0.09, 0.03), c, x * m.half * 0.42, 0, 0);
    part(g, slab(m.half * 0.3, 0.02, 0.03), c, 0, 0.02, 0);
    if (o.c2) for (const x of [-1, 1]) part(g, slab(m.half * 0.5, 0.02, 0.01), lit(o.c2, 0.9), x * m.half * 0.42, 0.015, -0.02);
  },
  mask(A, o, C, m) {
    const g = joint(A.head, 0, m.eye + 0.01, m.front + 0.015);
    part(g, slab(m.half * 1.9, 0.13, 0.04), lit(o.c ?? 0x1d1d24, 0, { rough: 0.4 }));
    for (const x of [-1, 1]) part(g, ball(0.035), lit(o.c2 ?? C.trim, o.glow ?? 1), x * m.half * 0.42, 0, -0.03, 1.4, 0.8, 0.5);
  },
  headphones(A, o, C, m) {
    const c = lit(o.c ?? C.trim, o.glow ?? 0.2), d = lit(o.c2 ?? 0x1d2340);
    part(A.head, ring(m.half * 1.02, 0.025, Math.PI), d, 0, m.eye + 0.02, 0);
    for (const x of [-1, 1]) { const cup = part(A.head, tube(0.09, 0.09, 0.07, 16), c, x * (m.half + 0.03), m.eye - 0.02, 0); cup.rotation.z = Math.PI / 2; }
  },
  flower(A, o, C, m) {
    const g = joint(A.head, m.half * 0.7, m.top - 0.06, -0.05), p = lit(o.c ?? 0xff8fd0, o.glow ?? 0.15, { rough: 0.6 });
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; part(g, ball(0.045), p, Math.cos(a) * 0.06, Math.sin(a) * 0.06, 0, 1, 1, 0.5); }
    part(g, ball(0.035), lit(o.c2 ?? 0xffe14a, 0.3), 0, 0, -0.02);
    g.rotation.y = -0.6;
  },
  leafcrown(A, o, C, m) {
    const g = joint(A.head, 0, m.top - 0.08, 0), c = lit(o.c ?? 0x5fbf4a, o.glow ?? 0, { rough: 0.7 }), r = m.half * 0.85;
    for (let i = 0; i < 9; i++) { const a = i / 9 * TAU, l = part(g, ball(0.06), c, Math.sin(a) * r, 0.03, Math.cos(a) * r, 0.5, 0.3, 1.3); l.rotation.y = a; l.rotation.x = -0.6; }
    if (o.c2) for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + 0.5; part(g, ball(0.04), lit(o.c2, 0.2), Math.sin(a) * r, 0.06, Math.cos(a) * r); }
  },
  shards(A, o, C, m) {
    const g = joint(A.head, 0, m.top - 0.04, 0.02), c = glass(o.c ?? 0x9fe8ff, 0.8, o.glow ?? 0.6), n = o.n ?? 5;
    for (let i = 0; i < n; i++) { const a = (i / (n - 1) - 0.5) * 1.6, s = part(g, cone(0.04, 0.18 + (i % 2) * 0.1, 4), c, Math.sin(a) * m.half * 0.55, 0.08, Math.cos(a) * 0.05 + 0.04); s.rotation.z = -a * 0.6; }
  },
  flames(A, o, C, m) {
    const g = joint(A.head, 0, m.top - 0.04, 0.03), fl = [], n = o.n ?? 4;
    for (let i = 0; i < n; i++) { const j = joint(g, (i / (n - 1) - 0.5) * m.half * 1.1, 0, (i % 2) * 0.06); part(j, cone(0.06, 0.22, 7), lit(i % 2 ? (o.c2 ?? 0xffd23c) : (o.c ?? 0xff5a2a), 1.4), 0, 0.1, 0); fl.push(j); }
    return (dt, sp, t) => fl.forEach((f, i) => { f.scale.y = 0.8 + Math.sin(t * 14 + i * 2) * 0.25; f.rotation.z = Math.sin(t * 7 + i) * 0.12; });
  },
  partyhat(A, o, C, m) {
    const g = joint(A.head, m.half * 0.25, m.top - 0.04, 0); g.rotation.z = -0.2;
    part(g, cone(0.12, 0.3, 14), lit(o.c ?? 0xff5fa0, 0.1), 0, 0.15, 0);
    for (const y of [0.06, 0.15]) part(g, ring(0.11 - y * 0.32, 0.014), lit(o.c2 ?? 0xffe14a, 0.3), 0, y, 0).rotation.x = Math.PI / 2;
    part(g, ball(0.045), lit(0xffffff, 0.2), 0, 0.31, 0);
  },
  mohawk(A, o, C, m) {
    const c = lit(o.c ?? C.trim, o.glow ?? 0.3, { rough: 0.5 }), n = o.n ?? 5;
    for (let i = 0; i < n; i++) { const z = m.front * 0.6 + (i / (n - 1)) * (m.back - m.front) * 0.75; const f = part(A.head, cone(0.045, 0.2 - Math.abs(i - n / 2) * 0.02, 4), c, 0, m.top + 0.04, z, 0.35, 1, 1.3); f.rotation.x = -0.35 + i * 0.12; }
  },
  bow(A, o, C, m) {
    const g = joint(A.head, -m.half * 0.55, m.top - 0.05, 0.02), c = lit(o.c ?? 0xff5fa0, o.glow ?? 0.1, { rough: 0.5 });
    for (const x of [-1, 1]) { const b = part(g, cone(0.07, 0.13, 4), c, x * 0.07, 0, 0); b.rotation.z = x * Math.PI / 2; }
    part(g, ball(0.035), c);
    g.rotation.z = 0.3;
  },
  propeller(A, o, C, m) {
    const g = joint(A.head, 0, m.top - 0.06, 0);
    part(g, dome(m.half * 0.85), lit(o.c ?? 0x3a8ac8, 0, { rough: 0.6 }), 0, 0, 0, 1, 0.55, 1);
    part(g, tube(0.012, 0.012, 0.09, 6), lit(0x2a2f3c), 0, m.half * 0.5, 0);
    const p = joint(g, 0, m.half * 0.5 + 0.05, 0);
    for (const x of [-1, 1]) part(p, slab(0.2, 0.01, 0.05), lit(o.c2 ?? 0xffd23c, 0.2), x * 0.1, 0, 0);
    return (dt, sp) => { p.rotation.y += dt * (10 + sp * 2); };
  },
  bandana(A, o, C, m) {
    const c = lit(o.c ?? C.trim, o.glow ?? 0, { rough: 0.7 });
    const b = part(A.head, tube(m.half * 1.02, m.half * 1.02, 0.07, 20), c, 0, m.eye + 0.1, 0);
    void b;
    const tail = joint(A.head, 0, m.eye + 0.1, m.back);
    const t1 = part(tail, slab(0.06, 0.03, 0.18), c, 0.04, 0, 0.08); t1.rotation.z = 0.3;
    const t2 = part(tail, slab(0.06, 0.03, 0.16), c, -0.04, -0.02, 0.07); t2.rotation.z = -0.3;
    return (dt, sp, t) => { tail.rotation.x = 0.3 + Math.min(1, sp / 6) * 0.6 + Math.sin(t * 9) * 0.1; };
  },
  gem(A, o, C, m) {
    const g = part(A.head, new THREE.OctahedronGeometry(0.05, 0), lit(o.c ?? C.trim, o.glow ?? 1, { rough: 0.1 }), 0, m.eye + 0.13, m.front + 0.02);
    g.scale.set(1, 1.3, 0.6);
  },
  tophat(A, o, C, m) {
    const g = joint(A.head, 0, m.top - 0.03, 0), c = lit(o.c ?? 0x1d1d24, 0, { rough: 0.5 });
    part(g, tube(m.half * 0.95, m.half * 0.95, 0.025, 20), c);
    part(g, tube(m.half * 0.6, m.half * 0.62, 0.28, 20), c, 0, 0.15, 0);
    part(g, tube(m.half * 0.63, m.half * 0.63, 0.05, 20), lit(o.c2 ?? C.trim, o.glow ?? 0.2), 0, 0.05, 0);
    g.rotation.z = 0.08;
  },
  beanie(A, o, C, m) {
    const g = joint(A.head, 0, m.top - 0.12, 0);
    part(g, dome(m.half * 1.02), lit(o.c ?? C.main, 0, { rough: 0.9 }), 0, 0, 0, 1, 0.8, 1);
    part(g, tube(m.half * 1.04, m.half * 1.04, 0.06, 20), lit(o.c2 ?? C.trim, 0, { rough: 0.9 }), 0, 0.02, 0);
    part(g, ball(0.06), lit(o.c2 ?? C.trim, 0, { rough: 0.95 }), 0, m.half * 0.85, 0);
  },
  // --- back ---
  cape(A, o, C, m) {
    const c = lit(o.c ?? C.main, o.glow ?? 0, { rough: 0.7, double: true }), segs = [];
    let prev = joint(A.spine, 0, m.neck - 0.02, m.bBack + 0.02);
    const w = Math.max(0.42, m.bHalf * 1.7), n = 4, len = (m.neck - m.waist + 0.55) / n;
    part(prev, tube(w * 0.42, w * 0.42, 0.05, 16), lit(o.c2 ?? C.trim, 0.2), 0, 0.02, -0.04);
    for (let i = 0; i < n; i++) {
      const j = i ? joint(prev, 0, -len, 0) : prev;
      part(j, slab(w * (1 + i * 0.08), len, 0.025), c, 0, -len / 2, 0);
      if (i === n - 1 && o.c2) part(j, slab(w * (1 + i * 0.08), 0.05, 0.03), lit(o.c2, 0.4), 0, -len, 0);
      segs.push(j); prev = j;
    }
    return (dt, sp, t) => { const k = Math.min(1, sp / 6.5); segs.forEach((s, i) => { s.rotation.x = (i ? 0.08 : 0.12 + k * 0.5) + Math.sin(t * 5 - i) * (0.05 + k * 0.08); }); };
  },
  wings(A, o, C, m) {
    const c = lit(o.c ?? 0xffffff, o.glow ?? 0.15, { rough: 0.6 }), sides = [];
    for (const x of [-1, 1]) {
      const w = joint(A.spine, x * 0.1, m.chest, m.bBack + 0.02);
      for (let i = 0; i < 5; i++) { const f = part(w, pill(0.045, 0.22 + i * 0.07), i % 2 ? lit(o.c2 ?? o.c ?? 0xf0f0f0, o.glow ?? 0.15) : c, x * (0.12 + i * 0.07), 0.05 - i * 0.05, 0.02 * i, 1, 1, 0.45); f.rotation.z = x * (1.1 + i * 0.18); }
      sides.push([w, x]);
    }
    return (dt, sp, t) => sides.forEach(([w, x]) => { w.rotation.y = x * (0.35 + Math.sin(t * (o.fast ? 9 : 2.5)) * (o.fast ? 0.35 : 0.12)); });
  },
  batwings(A, o, C, m) {
    const c = lit(o.c ?? 0x2a1a3a, o.glow ?? 0, { rough: 0.5, double: true }), sides = [];
    for (const x of [-1, 1]) {
      const w = joint(A.spine, x * 0.08, m.chest, m.bBack + 0.03);
      for (let i = 0; i < 3; i++) { const f = part(w, cone(0.12, 0.42 - i * 0.06, 3), c, x * (0.18 + i * 0.12), -0.02 - i * 0.04, 0, 1, 1, 0.15); f.rotation.z = x * (1.9 + i * 0.25); }
      part(w, pill(0.02, 0.4), lit(o.c2 ?? 0x1d1d24), x * 0.2, 0.06, 0).rotation.z = x * 1.3;
      sides.push([w, x]);
    }
    return (dt, sp, t) => sides.forEach(([w, x]) => { w.rotation.y = x * (0.3 + Math.sin(t * 3) * 0.15); });
  },
  butterfly(A, o, C, m) {
    const sides = [];
    for (const x of [-1, 1]) {
      const w = joint(A.spine, x * 0.06, m.chest, m.bBack + 0.03);
      part(w, flat, glass(o.c ?? 0xff8fd0, 0.65, o.glow ?? 0.6), x * 0.24, 0.12, 0, 0.24, 0.3, 1);
      part(w, flat, glass(o.c2 ?? 0x7af0ff, 0.6, o.glow ?? 0.6), x * 0.18, -0.16, 0, 0.16, 0.18, 1);
      sides.push([w, x]);
    }
    return (dt, sp, t) => sides.forEach(([w, x]) => { w.rotation.y = x * (0.4 + Math.sin(t * 6) * 0.35); });
  },
  jetpack(A, o, C, m) {
    const g = joint(A.spine, 0, m.chest - 0.06, m.bBack + 0.07), c = lit(o.c ?? 0x8a94a8, 0, { metal: 0.6, rough: 0.3 }), fl = [];
    part(g, slab(0.32, 0.36, 0.14), c);
    for (const x of [-1, 1]) {
      part(g, tube(0.07, 0.07, 0.4, 12), lit(o.c2 ?? C.trim, 0.2, { metal: 0.4 }), x * 0.14, -0.02, 0.07);
      part(g, tube(0.05, 0.07, 0.07, 12), lit(0x2a2f3c), x * 0.14, -0.25, 0.07);
      const f = joint(g, x * 0.14, -0.29, 0.07); part(f, cone(0.05, 0.2, 8), lit(o.flame ?? 0x7af0ff, 1.5), 0, -0.1, 0).rotation.x = Math.PI; fl.push(f);
    }
    return (dt, sp, t) => fl.forEach((f, i) => { f.scale.y = 0.6 + Math.random() * 0.5 + Math.min(1, sp / 7) * 0.6; void i; });
  },
  spikes(A, o, C, m) {
    const c = lit(o.c ?? C.trim, o.glow ?? 0, { rough: 0.4 }), n = o.n ?? 5;
    for (let i = 0; i < n; i++) { const y = m.neck - (i / (n - 1)) * (m.neck - m.waist) * 0.9; const s = part(A.spine, cone(0.06 - i * 0.004, 0.2 - i * 0.015, 5), c, 0, y, m.bBack + 0.03); s.rotation.x = Math.PI / 2 + 0.3; }
  },
  gear(A, o, C, m) {
    const g = joint(A.spine, 0, m.chest, m.bBack + 0.06), c = lit(o.c ?? 0xc9a14a, o.glow ?? 0.15, { metal: 0.7, rough: 0.25 }), r = 0.24 * (o.s ?? 1);
    part(g, ring(r, 0.04), c);
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, t = part(g, slab(0.06, 0.07, 0.05), c, Math.cos(a) * (r + 0.05), Math.sin(a) * (r + 0.05), 0); t.rotation.z = a; }
    for (let i = 0; i < 3; i++) { const s = part(g, slab(r * 2, 0.03, 0.03), c); s.rotation.z = i / 3 * Math.PI; }
    return dt => { g.rotation.z += dt * (o.spin ?? 0.8); };
  },
  banner(A, o, C, m) {
    const g = joint(A.spine, -m.bHalf * 0.5, m.waist, m.bBack + 0.05);
    part(g, tube(0.016, 0.016, 1.2, 6), lit(0x6b4a33, 0, { rough: 0.8 }), 0, 0.6, 0);
    part(g, ball(0.035), lit(0xffc93c, 0.2, { metal: 0.5 }), 0, 1.22, 0);
    const f = joint(g, 0, 1.12, 0);
    part(f, slab(0.02, 0.26, 0.4), lit(o.c ?? C.trim, o.glow ?? 0.15, { double: true }), 0, -0.13, 0.2);
    part(f, slab(0.022, 0.08, 0.08), lit(o.c2 ?? 0xffffff, 0.3), 0, -0.13, 0.22);
    return (dt, sp, t) => { f.rotation.y = Math.sin(t * 4) * 0.25 + Math.min(1, sp / 6) * 0.3; };
  },
  tail(A, o, C, m) {
    const c = lit(o.c ?? C.main, o.glow ?? 0, { rough: 0.6 }), segs = [];
    let prev = joint(A.hips, 0, 0.02, 0.22);
    for (let i = 0; i < 5; i++) { const j = i ? joint(prev, 0, 0, 0.1) : prev; part(j, ball(0.07 - i * 0.008), i === 4 && o.c2 ? lit(o.c2, 0.4) : c, 0, 0, 0.05, 1, 1, 1.4); segs.push(j); prev = j; }
    return (dt, sp, t) => segs.forEach((s, i) => { s.rotation.y = Math.sin(t * 4 - i * 0.7) * 0.25; s.rotation.x = -0.15 + Math.sin(t * 2 - i) * 0.05; });
  },
  ringback(A, o, C, m) {
    const g = joint(A.spine, 0, m.chest + 0.05, m.bBack + 0.12), c = lit(o.c ?? C.trim, o.glow ?? 1.1);
    part(g, ring(0.32 * (o.s ?? 1), 0.022), c);
    part(g, ring(0.22 * (o.s ?? 1), 0.012), c);
    return (dt, sp, t) => { g.rotation.z += dt * 0.6; g.scale.setScalar(1 + Math.sin(t * 3) * 0.03); };
  },
  // --- shoulders, chest and waist ---
  pads(A, o, C, m) {
    const c = lit(o.c ?? C.trim, o.glow ?? 0, { metal: 0.45, rough: 0.3 });
    for (const arm of [A.armL, A.armR]) {
      if (!arm) continue;
      part(arm, dome(0.15), c, 0, 0.03, 0, 1.1, 0.8, 1.1);
      if (o.spiky) for (let i = 0; i < 3; i++) part(arm, cone(0.03, 0.12, 5), lit(o.c2 ?? 0xdfe3e6, 0, { metal: 0.6 }), 0, 0.12, -0.06 + i * 0.06);
    }
  },
  emblem(A, o, C, m) {
    const g = joint(A.spine, 0, m.chest, m.bFront - 0.015), c = lit(o.c ?? C.trim, o.glow ?? 0.9, { rough: 0.2 }), sh = o.shape || 'star';
    if (sh === 'star') for (let i = 0; i < 5; i++) { const s = part(g, cone(0.035, 0.11, 3), c, Math.sin(i / 5 * TAU) * 0.05, Math.cos(i / 5 * TAU) * 0.05, 0, 1, 1, 0.3); s.rotation.z = -i / 5 * TAU; }
    if (sh === 'heart') { for (const x of [-1, 1]) part(g, ball(0.05), c, x * 0.04, 0.02, 0, 1, 1, 0.4); const b = part(g, cone(0.07, 0.1, 4), c, 0, -0.04, 0, 1, 1, 0.3); b.rotation.z = Math.PI; }
    if (sh === 'bolt') { part(g, slab(0.04, 0.12, 0.02), c, 0.02, 0.04, 0).rotation.z = -0.4; part(g, slab(0.04, 0.12, 0.02), c, -0.02, -0.05, 0).rotation.z = -0.4; }
    if (sh === 'diamond') part(g, new THREE.OctahedronGeometry(0.07, 0), c, 0, 0, 0, 1, 1.3, 0.4);
    if (sh === 'coin') { part(g, tube(0.08, 0.08, 0.02, 20), lit(0xffc93c, 0.4, { metal: 0.7 })).rotation.x = Math.PI / 2; part(g, slab(0.02, 0.08, 0.01), lit(0xc98a00), 0, 0, -0.012); }
    if (sh === 'skull') { part(g, ball(0.06), c, 0, 0.01, 0, 1, 1, 0.5); for (const x of [-1, 1]) part(g, ball(0.018), lit(0x1d1d24), x * 0.024, 0.01, -0.025); }
    if (sh === 'cross') { part(g, slab(0.04, 0.14, 0.02), c); part(g, slab(0.14, 0.04, 0.02), c); }
    if (sh === 'cog') { part(g, ring(0.05, 0.02), c); for (let i = 0; i < 6; i++) part(g, slab(0.03, 0.03, 0.02), c, Math.cos(i / 6 * TAU) * 0.075, Math.sin(i / 6 * TAU) * 0.075, 0); }
    if (sh === 'note') { part(g, ball(0.035), c, -0.02, -0.04, 0, 1.2, 1, 0.5); part(g, slab(0.015, 0.12, 0.015), c, 0.015, 0.02, 0); part(g, slab(0.04, 0.02, 0.015), c, 0.035, 0.075, 0).rotation.z = -0.4; }
    if (sh === 'ghost') { part(g, ball(0.06), c, 0, 0.01, 0, 1, 1.2, 0.4); for (const x of [-1, 1]) part(g, ball(0.015), lit(0x1d1d24), x * 0.022, 0.025, -0.022); }
    if (o.ring) part(g, ring(0.1, 0.012), lit(o.c2 ?? 0xffffff, 0.4), 0, 0, 0.005);
  },
  scarf(A, o, C, m) {
    const c = lit(o.c ?? C.trim, o.glow ?? 0, { rough: 0.85 });
    part(A.spine, tube(m.bHalf * 0.55, m.bHalf * 0.62, 0.1, 18), c, 0, m.neck - 0.02, 0, 1, 1, 0.9);
    const t = joint(A.spine, m.bHalf * 0.3, m.neck - 0.06, m.bFront + 0.05), segs = [];
    let prev = t;
    for (let i = 0; i < 3; i++) { const j = i ? joint(prev, 0, -0.1, 0) : prev; part(j, slab(0.1, 0.11, 0.03), i % 2 && o.c2 ? lit(o.c2) : c, 0, -0.05, 0); segs.push(j); prev = j; }
    return (dt, sp, t2) => segs.forEach((s, i) => { s.rotation.x = -Math.min(1, sp / 6) * 0.5 + Math.sin(t2 * 6 - i) * 0.08; });
  },
  necklace(A, o, C, m) {
    const c = lit(o.c ?? 0xffc93c, 0.2, { metal: 0.7, rough: 0.2 });
    const r = part(A.spine, ring(m.bHalf * 0.55, 0.016), c, 0, m.neck - 0.05, (m.bFront + m.bBack) / 2 - 0.02); r.rotation.x = Math.PI / 2 - 0.35;
    part(A.spine, o.shape === 'coin' ? tube(0.06, 0.06, 0.02, 16) : new THREE.OctahedronGeometry(0.05, 0), lit(o.c2 ?? 0xff4d6a, o.glow ?? 0.7, { metal: 0.4 }), 0, m.chest + 0.04, m.bFront - 0.03).rotation.x = Math.PI / 2;
  },
  belt(A, o, C, m) {
    part(A.spine, tube(m.bHalf * 0.98, m.bHalf * 0.98, 0.07, 20), lit(o.c ?? 0x2a2230, 0, { rough: 0.5 }), 0, m.waist + 0.04, (m.bFront + m.bBack) / 2, 1, 1, 0.85);
    part(A.spine, slab(0.13, 0.1, 0.04), lit(o.c2 ?? 0xffc93c, o.glow ?? 0.5, { metal: 0.6, rough: 0.2 }), 0, m.waist + 0.04, m.bFront - 0.01);
  },
  sash(A, o, C, m) {
    const s = part(A.spine, slab(0.09, (m.neck - m.waist) * 1.3, 0.025), lit(o.c ?? C.trim, o.glow ?? 0.1, { rough: 0.6 }), 0, (m.neck + m.waist) / 2, m.bFront - 0.01);
    s.rotation.z = 0.6;
  },
  stripes(A, o, C, m) {
    const c = lit(o.c ?? C.trim, o.glow ?? 1, { rough: 0.2 });
    for (const x of [-1, 1]) part(A.spine, slab(0.03, (m.neck - m.waist) * 0.8, 0.02), c, x * m.bHalf * 0.45, (m.neck + m.waist) / 2, m.bFront - 0.005);
    part(A.spine, slab(m.bHalf * 1.3, 0.03, 0.02), c, 0, m.waist + 0.12, m.bFront - 0.005);
  },
  // --- around the hero ---
  orbit(A, o, C, m) {
    const g = joint(A.root, 0, o.y ?? Math.min(1.4, m.height * 0.62), 0), n = o.n ?? 4, items = [];
    const geo = { cube, star: octa, tetra, ball: ball(0.05) }[o.shape || 'ball'] || ball(0.05);
    const mt = o.clear ? glass(o.c ?? C.trim, 0.6, o.glow ?? 0.8) : lit(o.c ?? C.trim, o.glow ?? 1.2);
    for (let i = 0; i < n; i++) { const j = joint(g, 0, 0, 0); const it = live(part(j, geo, i % 2 && o.c2 ? lit(o.c2, o.glow ?? 1.2) : mt, Math.max(0.55, m.wide * 0.9) * (o.r ?? 1), 0, 0)); it.castShadow = false; j.rotation.y = i / n * TAU; items.push([j, it, i]); }
    return (dt, sp, t) => { g.rotation.y += dt * (o.spin ?? 1.4); for (const [j, it, i] of items) { it.position.y = Math.sin(t * 2.2 + i * 1.7) * 0.12; it.rotation.x += dt * 2; it.rotation.y += dt * 3; } };
  },
  rise(A, o, C, m) {
    const n = o.n ?? 6, ps = [], mt = o.clear ? glass(o.c ?? C.trim, 0.6, o.glow ?? 1) : lit(o.c ?? C.trim, o.glow ?? 1.3);
    const geo = { cube, star: octa, tetra, ball: ball(0.035) }[o.shape || 'star'] || octa;
    for (let i = 0; i < n; i++) { const p = live(part(A.root, geo, mt, 0, 0, 0, o.s ?? 0.6)); p.castShadow = false; p.userData.k = Math.random(); p.userData.a = Math.random() * TAU; ps.push(p); }
    const R = Math.max(0.4, m.wide * 0.75), H = m.height + 0.2, dir = o.fall ? -1 : 1;
    return (dt, sp, t) => { for (const p of ps) { const d = p.userData; d.k = (d.k + dt * (o.speed ?? 0.35)) % 1; const y = dir > 0 ? d.k : 1 - d.k; p.position.set(Math.cos(d.a + t * 0.3) * R, 0.1 + y * H, Math.sin(d.a + t * 0.3) * R); p.scale.setScalar((o.s ?? 0.6) * Math.sin(d.k * Math.PI)); p.rotation.y += dt * 3; } };
  },
  aura(A, o, C, m) {
    const g = joint(A.root, 0, 0.05, 0), c = glass(o.c ?? C.trim, 0.55, o.glow ?? 1);
    const r1 = live(part(g, new THREE.RingGeometry(0.85, 0.95, 40), c)); r1.rotation.x = -Math.PI / 2; r1.castShadow = false;
    const r2 = live(part(g, new THREE.RingGeometry(1.02, 1.06, 40), c)); r2.rotation.x = -Math.PI / 2; r2.castShadow = false;
    return (dt, sp, t) => { g.rotation.y += dt * 0.5; const s = 1 + Math.sin(t * 2.5) * 0.06; r1.scale.setScalar(s); r2.scale.setScalar(2 - s); };
  },
};

// Add a look to a hero built on the rig (called from rig.finish, before baking).
export function dressLook(P, look, palette) {
  if (!look?.length) return null;
  const m = measure(P);
  const A = { root: P.root, head: P.head, spine: P.spine, hips: P.hips, armL: P.armL, armR: P.armR };
  const C = { main: palette.main, trim: palette.trim, dark: palette.dark };
  const ups = [];
  for (const it of look) {
    const [name, o] = typeof it === 'string' ? [it, {}] : it;
    const fn = PIECES[name]; if (!fn) continue;
    try { const u = fn(A, o || {}, C, m); if (u) ups.push(u); } catch (e) { console.warn('look piece failed', name, e); }
  }
  return ups.length ? (dt, sp, t) => { for (const u of ups) u(dt, sp, t); } : null;
}

// ---------- every skin's look ----------
export const LOOKS = {
  // Season 1 pass
  'vanguard-deep': [['visor', { c: 0x7af0ff }], ['pads', { c: 0xbfe6ff }], ['rise', { shape: 'ball', clear: true, c: 0xbfe6ff, n: 7, speed: 0.25 }]],
  'striker-night': [['shades', { c2: 0x6fe8ff }], ['stripes', { c: 0x6fe8ff }], ['orbit', { shape: 'tetra', n: 3, c: 0x6fe8ff }]],
  'ember-sapphire': [['crown', { c: 0xffd23c, c2: 0x3a66c8 }], ['cape', { c: 0x3a66c8, c2: 0xffd23c }], ['emblem', { shape: 'star', c: 0xffd23c }]],
  'warden-dawn': [['halo', { c: 0xffd0a0 }], ['wings', { c: 0xfff0e0, c2: 0xffd0b0 }], ['aura', { c: 0xffa27a }]],
  'thicket-autumn': [['leafcrown', { c: 0xd9733a, c2: 0xffd23c }], ['rise', { shape: 'tetra', c: 0xe0802a, glow: 0.3, fall: true, n: 6, speed: 0.25 }], ['scarf', { c: 0x8a3a1a }]],
  'ratchet-brass': [['gear', { c: 0xd9a441 }], ['tophat', { c: 0x3a2a1a, c2: 0xd9a441 }], ['necklace', { c: 0xd9a441, shape: 'coin', c2: 0x2fb39a }]],
  'mirage-emerald': [['tophat', { c: 0x0f2a22, c2: 0x2fbf7a }], ['orbit', { shape: 'star', n: 4, c: 0x2fbf7a }], ['emblem', { shape: 'diamond', c: 0x2fbf7a }]],
  'avalanche-aurora': [['shards', { c: 0x5be0b0, n: 5 }], ['ringback', { c: 0xb98cff }], ['aura', { c: 0x5be0b0 }]],
  'tempo-vapor': [['shades', { c: 0xff8fd0, c2: 0x6fe8ff }], ['headphones', { c: 0x6fe8ff }], ['orbit', { shape: 'cube', n: 4, c: 0xff8fd0, c2: 0x6fe8ff }]],
  'vanguard-coral': [['leafcrown', { c: 0xff7a6b, c2: 0xfff0d6 }], ['rise', { shape: 'ball', clear: true, c: 0xfff0d6, n: 6 }], ['necklace', { c: 0xfff0d6, c2: 0xff7a6b }]],
  'kestrel-storm': [['visor', { c: 0x7af0ff }], ['jetpack', { c: 0x3d4a6b, c2: 0x7af0ff, flame: 0x7af0ff }], ['emblem', { shape: 'bolt', c: 0x7af0ff }]],
  'striker-bubble': [['bow', { c: 0xff8fd0 }], ['rise', { shape: 'ball', clear: true, c: 0xff8fd0, n: 7, speed: 0.3 }], ['emblem', { shape: 'heart', c: 0xff8fd0 }]],
  'ember-ash': [['flames', { c: 0xff5a36, c2: 0xffd23c }], ['rise', { shape: 'tetra', c: 0xff5a36, n: 7, speed: 0.5 }], ['spikes', { c: 0x3a3a40, n: 4 }]],
  'warden-eclipse': [['halo', { c: 0xff5a36 }], ['batwings', { c: 0x1d2340, c2: 0xff5a36 }], ['ringback', { c: 0xff5a36, s: 1.2 }]],
  'thicket-frost': [['shards', { c: 0xbfe6ff }], ['rise', { shape: 'ball', c: 0xffffff, glow: 0.6, fall: true, n: 8, s: 0.4, speed: 0.2 }], ['scarf', { c: 0xbfe6ff, c2: 0xffffff }]],
  'ratchet-cobalt': [['visor', { c: 0x5ab8ff }], ['jetpack', { c: 0x2a3a6a, c2: 0x5ab8ff, flame: 0x5ab8ff }], ['pads', { c: 0x3a5ab0 }]],
  'mirage-noir': [['tophat', { c: 0x1a1a24, c2: 0xb0203a }], ['cape', { c: 0x1a1a24, c2: 0xb0203a }], ['mask', { c: 0x1a1a24, c2: 0xb0203a }]],
  'avalanche-gold': [['crown', { c: 0xffc93c, c2: 0xffffff }], ['pads', { c: 0xffc93c }], ['aura', { c: 0xffc93c }]],
  'croc-mardi': [['tophat', { c: 0x6a2a9a, c2: 0x3ccf9a }], ['necklace', { c: 0xffd23c, c2: 0x6a2a9a }], ['rise', { shape: 'cube', c: 0xffd23c, c2: 0x6a2a9a, n: 7, speed: 0.4, fall: true }]],
  'croc-albino': [['halo', { c: 0xe8f4ff }], ['aura', { c: 0xe8f4ff }], ['rise', { shape: 'ball', clear: true, c: 0xe8f4ff, n: 6, speed: 0.2 }]],
  // Season 2 pass
  'striker-turbo': [['visor', { c: 0xff3a2a }], ['stripes', { c: 0xffd23c }], ['jetpack', { c: 0xff3a2a, c2: 0xffffff, flame: 0xffa23a }]],
  'vanguard-pixel': [['pixelcrown', { c: 0x7af0ff }], ['pads', { c: 0x7af0ff }], ['orbit', { shape: 'cube', n: 4, c: 0x7af0ff }]],
  'croc-whack': [['partyhat', { c: 0xff5a2a, c2: 0xffe14a }], ['belt', { c: 0x1d1d24, c2: 0xffe14a }], ['emblem', { shape: 'star', c: 0xffe14a }]],
  'tempo-chiptune': [['headphones', { c: 0x39ff6a }], ['orbit', { shape: 'cube', n: 5, c: 0x39ff6a }], ['emblem', { shape: 'note', c: 0x39ff6a }]],
  'ember-neon': [['tophat', { c: 0x1d1d24, c2: 0xff3fa4 }], ['stripes', { c: 0xff3fa4 }], ['ringback', { c: 0x7af0ff }]],
  'pinball-gameover': [['antenna', { c: 0xff3a3a }], ['emblem', { shape: 'skull', c: 0xffffff, ring: true, c2: 0xff3a3a }], ['orbit', { shape: 'ball', n: 3, c: 0xd8dee8, glow: 0.3 }]],
  'medic-healthpack': [['emblem', { shape: 'cross', c: 0xff3a3a, ring: true }], ['jetpack', { c: 0xffffff, c2: 0xff3a3a, flame: 0x5fff8a }], ['orbit', { shape: 'cube', n: 3, c: 0x5fff8a }]],
  'ratchet-joystick': [['antenna', { c: 0xff3a3a }], ['jetpack', { c: 0x1d1d24, c2: 0xff3a3a, flame: 0xffe14a }], ['emblem', { shape: 'cog', c: 0xffe14a }]],
  'warden-ghost': [['emblem', { shape: 'ghost', c: 0xdff4ff }], ['orbit', { shape: 'ball', n: 3, clear: true, c: 0xdff4ff }], ['visor', { c: 0x5fff8a }]],
  'kestrel-starfighter': [['visor', { c: 0xffe14a }], ['wings', { c: 0xd8dee8, c2: 0x3a8ac8, fast: false }], ['rise', { shape: 'star', c: 0xffffff, n: 6, speed: 0.6 }]],
  'slime-neon': [['antenna', { c: 0x39ff6a }], ['aura', { c: 0x39ff6a }], ['rise', { shape: 'ball', clear: true, c: 0x39ff6a, n: 7, speed: 0.35 }]],
  'dancer-machine': [['shades', { c: 0x1d1d24, c2: 0xff3fa4 }], ['orbit', { shape: 'star', n: 5, c: 0xff3fa4, c2: 0x7af0ff }], ['aura', { c: 0xff3fa4 }]],
  'avalanche-cabinet': [['visor', { c: 0x7af0ff }], ['shards', { c: 0x7af0ff, n: 3 }], ['orbit', { shape: 'cube', n: 4, c: 0x9fe8ff }]],
  'clawbot-plush': [['bunny', { c: 0xffd0e0, c2: 0xff8fd0 }], ['bow', { c: 0xff8fd0 }], ['emblem', { shape: 'heart', c: 0xff8fd0 }]],
  'brawler-finalround': [['bandana', { c: 0xff3a3a }], ['belt', { c: 0xffc93c, c2: 0xffffff }], ['cape', { c: 0xb0203a, c2: 0xffc93c }]],
  'spark-coinop': [['necklace', { shape: 'coin', c: 0xffc93c, c2: 0xffc93c }], ['orbit', { shape: 'ball', n: 4, c: 0xffc93c, glow: 0.6 }], ['visor', { c: 0xffe14a }]],
  'chef-pizza': [['partyhat', { c: 0xff3a3a, c2: 0xffe14a }], ['scarf', { c: 0xff3a3a, c2: 0xffffff }], ['orbit', { shape: 'tetra', n: 3, c: 0xffc93c, glow: 0.4 }]],
  'cavalier-joust': [['crown', { c: 0xffc93c, c2: 0x3a66c8 }], ['banner', { c: 0x3a66c8, c2: 0xffc93c }], ['pads', { c: 0xffc93c, spiky: true }]],
  'mirage-highscore': [['pixelcrown', { c: 0xffe14a }], ['orbit', { shape: 'cube', n: 5, c: 0xff3fa4, c2: 0xffe14a }], ['emblem', { shape: 'star', c: 0xffe14a }]],
  'builder-blockdrop': [['orbit', { shape: 'cube', n: 5, c: 0xff3a3a, c2: 0x3a8ac8, glow: 0.6, spin: 0.8 }], ['pixelcrown', { c: 0x39ff6a }], ['jetpack', { c: 0xffe14a, c2: 0x3a8ac8, flame: 0x39ff6a }]],
  'thicket-bonus': [['flower', { c: 0xffe14a, c2: 0xff3a3a }], ['rise', { shape: 'star', c: 0xffe14a, n: 6 }], ['aura', { c: 0x39ff6a }]],
  'manspider-bug': [['antenna', { c: 0x39ff6a }], ['visor', { c: 0x39ff6a }], ['orbit', { shape: 'cube', n: 5, c: 0x39ff6a, spin: 2.2 }]],
  'microwave-arcade': [['antenna', { c: 0x7af0ff }], ['stripes', { c: 0x7af0ff }], ['orbit', { shape: 'cube', n: 4, c: 0xff3fa4, c2: 0x7af0ff }]],
  'shepherd-8bit': [['pixelcrown', { c: 0x39ff6a }], ['orbit', { shape: 'cube', n: 4, c: 0xffffff, glow: 0.8 }], ['visor', { c: 0x39ff6a }]],
  'wellington-tokens': [['tophat', { c: 0x1d1d24, c2: 0xffd23c }], ['necklace', { shape: 'coin', c: 0xffd23c, c2: 0xffd23c }], ['orbit', { shape: 'ball', n: 5, c: 0xffd23c, glow: 0.5 }]],
  'pinball-chrome': [['visor', { c: 0xff3fa4 }], ['gear', { c: 0xd8dee8, spin: 1.6 }], ['orbit', { shape: 'ball', n: 3, c: 0xd8dee8, glow: 0.2 }]],
  'elf-pixel': [['pixelcrown', { c: 0x7a5cff }], ['cape', { c: 0x16402a, c2: 0x39ff6a }], ['orbit', { shape: 'cube', n: 4, c: 0x39ff6a }]],
  // slot machine exclusives: the loudest looks
  'slime-magma': [['flames', { c: 0xff6a2a, c2: 0xffe14a, n: 5 }], ['rise', { shape: 'ball', c: 0xff6a2a, n: 8, speed: 0.5 }], ['aura', { c: 0xff6a2a }]],
  'brawler-chrome': [['shades', { c: 0xd8dee8, c2: 0xff4fa3 }], ['belt', { c: 0x2a2f3c, c2: 0xff4fa3 }], ['pads', { c: 0xd8dee8, spiky: true, c2: 0xff4fa3 }]],
  'chipmunk-gold': [['crown', { c: 0xffc93c, c2: 0x8a4a1a }], ['gear', { c: 0xffc93c, s: 1.2 }], ['orbit', { shape: 'ball', n: 4, c: 0xffc93c, glow: 0.5 }]],
  'vanguard-cosmos': [['halo', { c: 0x7af0ff }], ['ringback', { c: 0x7af0ff, s: 1.3 }], ['orbit', { shape: 'star', n: 6, c: 0xffffff, c2: 0x7af0ff, r: 1.2 }], ['cape', { c: 0x120a3a, c2: 0x7af0ff }]],
  'striker-glitch': [['visor', { c: 0xff2a8a }], ['orbit', { shape: 'cube', n: 6, c: 0x18e0f0, c2: 0xff2a8a, spin: 3 }], ['mohawk', { c: 0xff2a8a, glow: 0.8 }]],
  'croc-gummy': [['bow', { c: 0xfff07a }], ['orbit', { shape: 'ball', n: 5, clear: true, c: 0xff5fa0, c2: 0xfff07a }], ['aura', { c: 0xff5fa0 }]],
  'cavalier-phantom': [['halo', { c: 0x9fe8ff }], ['cape', { c: 0x1a2240, c2: 0x9fe8ff, glow: 0.2 }], ['rise', { shape: 'ball', clear: true, c: 0x9fe8ff, n: 8, speed: 0.3 }], ['aura', { c: 0x5a3aff }]],
  'mirage-hologram': [['ringback', { c: 0x7af0ff }], ['orbit', { shape: 'tetra', n: 5, clear: true, c: 0x7af0ff, c2: 0xff8fd0 }], ['visor', { c: 0xff8fd0 }], ['aura', { c: 0x7af0ff }]],
  'ember-supernova': [['halo', { c: 0xff7af0 }], ['orbit', { shape: 'star', n: 6, c: 0xff7af0, c2: 0xffffff, r: 1.15 }], ['ringback', { c: 0xff7af0, s: 1.4 }], ['cape', { c: 0x2a1a5a, c2: 0xff7af0 }]],
  'warden-stained': [['halo', { c: 0xffd23c }], ['butterfly', { c: 0x3a8ac8, c2: 0xffd23c }], ['emblem', { shape: 'diamond', c: 0xff4d6a, ring: true, c2: 0xffd23c }]],
  'thicket-sakura': [['flower', { c: 0xffb3cf, c2: 0xffffff }], ['rise', { shape: 'tetra', c: 0xffb3cf, glow: 0.4, fall: true, n: 9, speed: 0.2 }], ['leafcrown', { c: 0xffb3cf, c2: 0xffffff }]],
  'ratchet-overclock': [['visor', { c: 0x39ff9a }], ['gear', { c: 0x39ff9a, glow: 0.8, spin: 3 }], ['rise', { shape: 'cube', c: 0x39ff9a, n: 6, speed: 0.6 }], ['stripes', { c: 0x39ff9a }]],
  'avalanche-volcanic': [['horns', { c: 0x1a0c0c, glow: 0, s: 1.2 }], ['flames', { c: 0xff6a2a, c2: 0xffe14a }], ['rise', { shape: 'tetra', c: 0xff6a2a, n: 8, speed: 0.55 }], ['spikes', { c: 0xff6a2a, glow: 0.6 }]],
  'tempo-clockwork': [['gear', { c: 0xc9a14a, s: 1.2 }], ['tophat', { c: 0x2a2f3c, c2: 0xc9a14a }], ['orbit', { shape: 'ball', n: 3, c: 0xc9a14a, glow: 0.4 }], ['emblem', { shape: 'cog', c: 0xc9a14a }]],
  'kestrel-phoenix': [['wings', { c: 0xff5a2a, c2: 0xffe14a, glow: 0.9, fast: false }], ['flames', { c: 0xff5a2a, c2: 0xffe14a, n: 3 }], ['rise', { shape: 'tetra', c: 0xffa23a, n: 8, speed: 0.6 }]],
  'elf-winter': [['shards', { c: 0xbfe6ff, n: 7 }], ['cape', { c: 0xdff4ff, c2: 0x7ab8ff }], ['rise', { shape: 'ball', c: 0xffffff, glow: 0.7, fall: true, n: 9, s: 0.4, speed: 0.2 }]],
  'dancer-blackswan': [['wings', { c: 0x1a1a24, c2: 0x2a2a3a, glow: 0 }], ['crown', { c: 0x1a1a24, c2: 0xff2a5a, n: 7 }], ['rise', { shape: 'tetra', c: 0x1a1a24, glow: 0, fall: true, n: 7, speed: 0.25 }]],
  'mole-diamond': [['shards', { c: 0x9fe8ff, n: 5 }], ['orbit', { shape: 'star', n: 5, clear: true, c: 0x9fe8ff, c2: 0xffffff }], ['necklace', { c: 0xffffff, c2: 0x9fe8ff }]],
  'medic-plague': [['tophat', { c: 0x120e18, c2: 0xb98cff }], ['cape', { c: 0x120e18, c2: 0xb98cff }], ['rise', { shape: 'ball', clear: true, c: 0xb98cff, n: 7, speed: 0.25 }]],
  'spark-thunder': [['ringback', { c: 0x7af0ff, s: 1.2 }], ['orbit', { shape: 'tetra', n: 5, c: 0x7af0ff, spin: 3 }], ['emblem', { shape: 'bolt', c: 0x7af0ff }], ['mohawk', { c: 0x7af0ff, glow: 1 }]],
  'builder-marble': [['leafcrown', { c: 0xffc93c, glow: 0.3 }], ['pads', { c: 0xf0ece4 }], ['sash', { c: 0xffc93c }], ['aura', { c: 0xffc93c }]],
  'wellington-truffle': [['tophat', { c: 0x120c08, c2: 0xffd23c }], ['cape', { c: 0x120c08, c2: 0xffd23c }], ['necklace', { c: 0xffd23c, c2: 0xffd23c, shape: 'coin' }]],
  'shepherd-tartan': [['crown', { c: 0xffd23c, c2: 0x2a4fb0 }], ['sash', { c: 0x6a1a2a }], ['cape', { c: 0x2a4fb0, c2: 0xffd23c }]],
  'microwave-retro': [['antenna', { c: 0xff5a5a }], ['ringback', { c: 0x5ad8c8 }], ['orbit', { shape: 'ball', n: 3, c: 0xff5a5a, glow: 0.6 }]],
  'chef-noir': [['tophat', { c: 0x0c0c12, c2: 0xffc93c }], ['scarf', { c: 0xffc93c }], ['rise', { shape: 'star', c: 0xffc93c, n: 6, speed: 0.3 }]],
  'manspider-tarantula': [['shades', { c: 0x1d1d24 }], ['necklace', { c: 0xff8a3c, c2: 0xff8a3c }], ['belt', { c: 0x2a160a, c2: 0xff8a3c }]],
  'magnet-thunder': [['visor', { c: 0xffe14a }], ['emblem', { shape: 'bolt', c: 0xffe14a }], ['orbit', { shape: 'bolt', n: 4, c: 0x7ab0ff, glow: 0.9 }], ['aura', { c: 0x7ab0ff }]],
};

// A short "what it adds" line for the closet.
const LABEL = { crown: 'crown', pixelcrown: 'pixel crown', halo: 'halo', horns: 'horns', antenna: 'antenna', ears: 'ears', bunny: 'bunny ears', visor: 'glowing visor',
  shades: 'shades', mask: 'mask', headphones: 'headphones', flower: 'flower', leafcrown: 'wreath', shards: 'crystal crown', flames: 'flame hair', partyhat: 'party hat',
  mohawk: 'mohawk', bow: 'bow', propeller: 'propeller cap', bandana: 'bandana', gem: 'gem', tophat: 'top hat', beanie: 'beanie', cape: 'cape', wings: 'wings',
  batwings: 'bat wings', butterfly: 'butterfly wings', jetpack: 'jetpack', spikes: 'back spikes', gear: 'spinning gear', banner: 'banner', tail: 'tail', ringback: 'halo ring',
  pads: 'shoulder pads', emblem: 'emblem', scarf: 'scarf', necklace: 'necklace', belt: 'belt', sash: 'sash', stripes: 'light stripes', orbit: 'orbiting pieces',
  rise: 'particles', aura: 'aura' };
export const lookSummary = id => (LOOKS[id] || []).map(it => LABEL[typeof it === 'string' ? it : it[0]]).filter(Boolean).join(', ');
