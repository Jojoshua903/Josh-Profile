import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';

// Shared stylised hero rig. Smooth high-segment shapes, soft physically shaded materials with
// a warm rim light, a jointed body (hips, spine, neck, elbows, knees) and procedural motion:
// gait with knee bend, hip sway and counter-twist, breathing, head drift, blinking.
// Conventions match the old models: face -z, head centre near y=1.66, feet at y=0.

// ---------- materials ----------
const RIM = `#include <emissivemap_fragment>
  { float rimF = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 2.6);
    totalEmissiveRadiance += vec3(1.0, 0.93, 0.84) * rimF * RIMK; }`;
const mats = new Map();
export function mat(color, o = {}) {
  const rim = (o.rim ?? 0.3).toFixed(2);
  const key = [color, o.rough ?? 0.6, o.metal || 0, o.glow || 0, rim, o.double ? 2 : 1].join(':');
  if (mats.has(key)) return mats.get(key);
  const m = new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? 0.6, metalness: o.metal || 0, emissive: o.glow ? color : 0x000000, emissiveIntensity: o.glow || 0, side: o.double ? THREE.DoubleSide : THREE.FrontSide });
  m.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', RIM.replace('RIMK', rim)); };
  m.customProgramCacheKey = () => 'rim' + rim;
  mats.set(key, m);
  return m;
}
// The hero's palette as materials. Skins can add a finish: { metal, rough, glow } on main/trim.
export function kit(p) {
  const f = p.finish || {};
  return {
    main: mat(p.main, { rough: f.rough ?? 0.62, metal: f.metal || 0 }),
    trim: mat(p.trim, { rough: f.trimRough ?? 0.42, metal: f.trimMetal ?? 0.1, glow: f.glow || 0 }),
    dark: mat(p.dark, { rough: 0.72 }),
    skin: mat(p.skin ?? 0xf2c6a0, { rough: 0.78, rim: 0.4 }),
    ink: mat(0x1d2340, { rough: 0.5 }),
    white: mat(0xffffff, { rough: 0.35 }),
    eye: mat(0x1d2340, { rough: 0.12 }),
    shine: mat(0xffffff, { glow: 1, rim: 0 }),
    leather: mat(0x6b4a33, { rough: 0.85 }),
    steel: mat(0xb8c0cc, { rough: 0.28, metal: 0.35 }),
    gold: mat(0xffc93c, { rough: 0.3, metal: 0.3 }),
    glass: mat(0x7af0ff, { rough: 0.1, glow: 0.5 }),
    c: (color, o) => mat(color, o),
  };
}

// ---------- smooth geometry (cached) ----------
const geos = new Map();
const memo = (k, fn) => { if (!geos.has(k)) geos.set(k, fn()); return geos.get(k); };
export const ball = (r) => memo('b' + r, () => new THREE.SphereGeometry(r, 18, 12));
export const pill = (r, l) => memo(`p${r}:${l}`, () => new THREE.CapsuleGeometry(r, l, 4, 12));
export const tube = (a, b, h, s = 16) => memo(`t${a}:${b}:${h}:${s}`, () => new THREE.CylinderGeometry(a, b, h, s));
export const cone = (r, h, s = 12) => memo(`c${r}:${h}:${s}`, () => new THREE.ConeGeometry(r, h, s));
export const ring = (r, t, arc = Math.PI * 2) => memo(`r${r}:${t}:${arc}`, () => new THREE.TorusGeometry(r, t, 6, 20, arc));
export const slab = (w, h, d) => memo(`s${w}:${h}:${d}`, () => new THREE.BoxGeometry(w, h, d));
// Lathe profile for a tapered torso: bottom width, waist, chest, shoulder top, height
export const torsoGeo = (b, waist, chest, top, h) => memo(`L${b}:${waist}:${chest}:${top}:${h}`, () => {
  const pts = [[0.001, 0], [b, 0.02], [waist, h * 0.32], [chest, h * 0.68], [top, h * 0.92], [top * 0.55, h], [0.001, h * 1.02]].map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(new THREE.SplineCurve(pts).getPoints(14), 18);
});

export function part(parent, geo, m, x = 0, y = 0, z = 0, sx, sy, sz) {
  const o = new THREE.Mesh(geo, m); o.position.set(x, y, z);
  if (sx != null) o.scale.set(sx, sy ?? sx, sz ?? sx);
  o.castShadow = true; parent.add(o); return o;
}
export const joint = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };

// ---------- the body ----------
// o: { w (width), top/pants/boots/gloves materials, legs:false (custom), headR, torso: [b,waist,chest,top,h],
//      flat (chest depth), shoes: 'boot'|'sneaker'|'none' }
export function body(K, o = {}) {
  const w = o.w ?? 1, root = new THREE.Group();
  const P = { root, w };
  P.hipY = o.hipY ?? 0.9;
  P.hips = joint(root, 0, P.hipY, 0);
  part(P.hips, ball(0.21), o.pants || K.dark, 0, 0.02, 0, 1.15 * w, 0.75, 0.85);
  if (o.legs !== false) {
    for (const s of [-1, 1]) {
      const leg = joint(P.hips, s * 0.13 * w, -0.04, 0);
      part(leg, pill(0.105 * Math.sqrt(w), 0.26), o.pants || K.dark, 0, -0.2, 0);
      const knee = joint(leg, 0, -0.4, 0);
      part(knee, pill(0.09 * Math.sqrt(w), 0.26), o.shins || o.pants || K.dark, 0, -0.17, 0);
      const foot = joint(knee, 0, -0.35, 0);
      const shoe = o.boots || K.ink;
      if (o.shoes === 'sneaker') { part(foot, ball(0.11), shoe, 0, -0.03, -0.05, 1.05, 0.7, 1.6); part(foot, slab(0.2, 0.035, 0.33), o.soles || K.white, 0, -0.085, -0.05); }
      else part(foot, ball(0.115), shoe, 0, -0.03, -0.05, 1.05, 0.78, 1.55);
      P[s < 0 ? 'legL' : 'legR'] = leg; P[s < 0 ? 'kneeL' : 'kneeR'] = knee; P[s < 0 ? 'footL' : 'footR'] = foot;
    }
  }
  P.spine = joint(P.hips, 0, 0.05, 0);
  const tg = o.torso || [0.2 * w, 0.22 * w, 0.29 * w, 0.27 * w, 0.56];
  P.torso = part(P.spine, torsoGeo(...tg), o.top || K.main, 0, -0.04, 0, 1, 1, o.flat ?? 0.78);
  P.chestY = tg[4] * 0.6;
  P.neck = part(P.spine, pill(0.075, 0.08), K.skin, 0, tg[4] + 0.02, 0);
  P.head = joint(P.spine, 0, 0.71, 0);
  if (o.headR !== 0) P.skull = part(P.head, ball(o.headR ?? 0.29), K.skin, 0, 0, 0, 1, 1.03, 0.98);
  // arms: R holds the weapon, L supports it
  const sh = tg[3] + 0.06;
  for (const s of [1, -1]) {
    const arm = joint(P.spine, s * sh, tg[4] - 0.1, 0);
    part(arm, ball(0.1 * Math.sqrt(w)), o.top || K.main, 0, 0, 0);
    part(arm, pill(0.08 * Math.sqrt(w), 0.2), o.sleeves || o.top || K.main, 0, -0.15, 0);
    const elbow = joint(arm, 0, -0.3, 0);
    part(elbow, pill(0.07 * Math.sqrt(w), 0.18), o.forearms || o.sleeves || o.top || K.main, 0, -0.12, 0);
    const hand = part(elbow, ball(0.075), o.gloves || K.skin, 0, -0.27, -0.01, 1, 1.05, 1.15);
    P[s > 0 ? 'armR' : 'armL'] = arm; P[s > 0 ? 'elbowR' : 'elbowL'] = elbow; P[s > 0 ? 'handR' : 'handL'] = hand;
  }
  return P;
}

// Big friendly eyes, brows, nose and mouth. o: { brow: tilt, mouth: 'smile'|'smirk'|'flat'|'open', cheeks, eyeColor, lashes }
export function face(P, K, o = {}) {
  const h = P.head, r = o.r ?? 0.29, z = -r * 0.86;
  P.eyes = [];
  for (const s of [-1, 1]) {
    const e = joint(h, s * 0.105, 0.035, z);
    part(e, ball(0.068), K.white, 0, 0, 0, 1, 1.2, 0.55);
    part(e, ball(0.042), o.eyeColor ? K.c(o.eyeColor, { rough: 0.15 }) : K.eye, s * 0.006, -0.004, -0.028, 1, 1.15, 0.5);
    part(e, ball(0.014), K.shine, s * -0.012, 0.02, -0.05);
    P.eyes.push(e);
    const brow = part(h, pill(0.018, 0.09), o.browMat || K.ink, s * 0.11, 0.135, z - 0.01);
    brow.rotation.z = Math.PI / 2 + s * (o.brow ?? 0.12);
    if (o.lashes) { const l = part(h, slab(0.05, 0.012, 0.01), K.ink, s * 0.15, 0.1, z + 0.02); l.rotation.z = s * -0.5; }
    if (o.cheeks) part(h, ball(0.045), K.c(0xff8a8a, { rough: 0.9, rim: 0 }), s * 0.17, -0.06, z + 0.06, 1, 0.6, 0.4);
  }
  part(h, ball(0.04), K.skin, 0, -0.03, z - 0.03, 1, 1, 1.1);                // nose
  const m = o.mouth || 'smile';
  if (m === 'open') part(h, ball(0.05), K.c(0x6b2a3a, { rough: 0.9, rim: 0 }), 0, -0.13, z + 0.03, 1.1, 0.75, 0.5);
  else {
    const mouth = part(h, ring(0.055, 0.012, m === 'flat' ? 0.6 : Math.PI * 0.75), K.c(0x6b2a3a, { rough: 0.9, rim: 0 }), 0, -0.11, z + 0.03);
    mouth.rotation.z = m === 'flat' ? Math.PI * 1.35 : Math.PI * 1.125 + (m === 'smirk' ? 0.35 : 0);
  }
}

// ---------- finishing: team ring, shield, weapon mount and the animation ----------
export function gunAt(P, x = 0.26, y = 1.28, z = -0.46) { const g = joint(P.root, x, y, z); return g; }
export function tip(gun, z) { const t = new THREE.Object3D(); t.position.z = z; gun.add(t); return t; }

export function finish(P, team, gun, muzzleZ, extra, opt = {}) {
  const { root } = P;
  const tr = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.8, 48), new THREE.MeshBasicMaterial({ color: team, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
  tr.rotation.x = -Math.PI / 2; tr.position.y = 0.04; root.add(tr);
  const shield = new THREE.Mesh(new THREE.SphereGeometry(1.25, 20, 14), new THREE.MeshBasicMaterial({ color: 0x5fe0c0, transparent: true, opacity: 0.24, depthWrite: false }));
  shield.position.y = 1; shield.visible = false; root.add(shield);
  // team-coloured armband so sides read at a glance whatever the skin
  if (P.armL) part(P.armL, tube(0.088, 0.088, 0.06), mat(team, { rough: 0.4, glow: 0.25 }), 0, -0.12, 0);
  const o = { root, gun: tip(gun, muzzleZ), shield, legs: opt.legs || [P.legL, P.legR], arms: [P.armR], P };
  const aim = opt.aim ?? [1.0, 0.62], off = opt.off ?? [0.95, 0.8, 0.42];
  const blinkAt = Math.random() * 4;
  o.anim = (dt, speed, t) => {
    o.walkT = (o.walkT || 0) + dt * speed * (opt.stride ?? 1.55);
    const k = Math.min(1, speed / 6.5), w = o.walkT, s = Math.sin(w), c = Math.cos(w), idle = 1 - k;
    if (P.legL && !opt.legs) {
      P.legL.rotation.x = s * 0.72 * k; P.legR.rotation.x = -s * 0.72 * k;
      P.kneeL.rotation.x = -Math.max(0, c) * 1.15 * k - 0.04; P.kneeR.rotation.x = -Math.max(0, -c) * 1.15 * k - 0.04;
      P.footL.rotation.x = Math.max(0, -s) * 0.4 * k; P.footR.rotation.x = Math.max(0, s) * 0.4 * k;
    }
    P.hips.position.y = P.hipY + (Math.abs(c) - 0.6) * 0.06 * k;
    P.hips.rotation.y = s * 0.14 * k; P.hips.rotation.z = c * 0.04 * k;
    P.spine.rotation.y = -s * 0.2 * k; P.spine.rotation.x = 0.1 * k;
    const br = Math.sin(t * 2.1 + blinkAt);
    P.spine.scale.set(1 + br * 0.012 * idle, 1 + br * 0.018 * idle, 1 + br * 0.012 * idle);
    P.head.rotation.x = Math.sin(t * 1.1) * 0.035 * idle - 0.05 * k;
    P.head.rotation.y = Math.sin(t * 0.6 + blinkAt) * 0.1 * idle + s * 0.12 * k;
    // arms: weapon held at the chest, gentle bob; the free arm swings if the hero has one
    P.armR.rotation.x = aim[0] + Math.sin(w * 2) * 0.05 * k + br * 0.02 * idle; P.armR.rotation.z = -0.1;
    P.elbowR.rotation.x = aim[1];
    if (opt.freeL) { P.armL.rotation.x = s * 0.65 * k + 0.05; P.armL.rotation.z = -0.12; P.elbowL.rotation.x = 0.25 + k * 0.3; }
    else { P.armL.rotation.x = off[0] + Math.sin(w * 2) * 0.05 * k; P.armL.rotation.z = off[2]; P.elbowL.rotation.x = off[1]; }
    if (P.eyes) { const bl = ((t + blinkAt) % 3.6) < 0.11 ? 0.1 : 1; for (const e of P.eyes) e.scale.y = bl; }
    extra?.(dt, speed, t, k, w);
  };
  bake(root);                                                            // merge static pieces: far fewer draw calls
  root.traverse(m => { if (m.isMesh && m !== tr && m !== shield) m.castShadow = true; });
  return o;
}

// Secondary-motion chain (scarves, tails, braids, capes): segments that lag and wave.
export function chain(parent, n, seg, m, x, y, z, r0, r1 = r0 * 0.5, dir = [0, 0, 1]) {
  const segs = []; let prev = parent;
  for (let i = 0; i < n; i++) {
    const g = joint(prev, i ? dir[0] * seg : x, i ? dir[1] * seg : y, i ? dir[2] * seg : z);
    const r = r0 + (r1 - r0) * (i / Math.max(1, n - 1));
    part(g, ball(r), m, dir[0] * seg * 0.5, dir[1] * seg * 0.5, dir[2] * seg * 0.5, 1, 1, seg / (r * 1.6));
    segs.push(g); prev = g;
  }
  segs.wave = (t, k, amp = 0.15, speed = 6) => segs.forEach((g, i) => { g.rotation.x = 0.12 + k * 0.35 + Math.sin(t * speed - i * 0.8) * amp * (0.5 + k); g.rotation.y = Math.sin(t * speed * 0.5 - i * 0.6) * amp; });
  return segs;
}

// Caps, helmets and hair tops (upper part of a sphere) and an open-fronted hood.
export const dome = (r, t = Math.PI / 2) => memo(`d${r}:${t}`, () => new THREE.SphereGeometry(r, 18, 9, 0, Math.PI * 2, 0, t));
export const hood = (r, gap = 1.7) => memo(`h${r}:${gap}`, () => new THREE.SphereGeometry(r, 18, 12, 1.5 * Math.PI + gap / 2, 2 * Math.PI - gap, 0, Math.PI * 0.8));

// ---------- baking ----------
// Mark a mesh that animates on its own (pulses, spins, blinks) so baking leaves it separate.
export const live = m => { m.userData.live = true; return m; };
// Merge every static mesh that shares a parent joint and a material into one mesh. A hero built
// from ~100 primitives ends up as ~25 meshes, which cuts draw calls (and shadow passes) by ~4x.
export function bake(root) {
  const groups = new Map();
  root.traverse(o => {
    if (!o.isMesh || o.userData.live || o.children.length || !o.material?.isMeshStandardMaterial) return;
    const k = o.parent.uuid + ':' + o.material.uuid;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(o);
  });
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const parent = list[0].parent, geos = [];
    for (const m of list) {
      m.updateMatrix();
      const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      g.applyMatrix4(m.matrix); geos.push(g); parent.remove(m);
    }
    let n = 0; for (const g of geos) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
    let off = 0;
    for (const g of geos) { pos.set(g.attributes.position.array, off * 3); nor.set(g.attributes.normal.array, off * 3); off += g.attributes.position.count; g.dispose(); }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.computeBoundingSphere();
    const mesh = new THREE.Mesh(out, list[0].material); mesh.castShadow = true; parent.add(mesh);
  }
}
