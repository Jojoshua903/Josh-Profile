// ==========================================================
// exterior.js — the whole WIDR 64 Mansion seen from outside, for the
// story scenes: a three-storey Victorian house with two wings and the
// painter's tower, on a hill under the moon. Its windows light up as
// each part of the house is cleared, so the outside tells the story.
// ==========================================================
import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { makeWoodTexture, makeStoneTexture, makeGlowTexture, makeReliefMaps } from '../graphics/textures.js';
import { buildGhost } from '../graphics/models.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const std = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05, flatShading: true, ...opts });

// which part of the house each area lights up (matches the game's areas)
export const AREA_NAMES = {
  1: 'the ground floor',
  2: 'the West Wing',
  3: 'the upper floor',
  4: 'the East Wing and the cellar',
  5: 'the tower',
};

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const SKY_FRAG = /* glsl */ `
uniform float uDawn;
varying vec3 vDir;
void main() {
  float h = clamp(vDir.y, -0.2, 1.0);
  vec3 nightTop = vec3(0.01, 0.015, 0.05);
  vec3 nightLow = vec3(0.06, 0.05, 0.14);
  vec3 dawnTop = vec3(0.12, 0.2, 0.42);
  vec3 dawnLow = vec3(1.0, 0.55, 0.32);
  vec3 top = mix(nightTop, dawnTop, uDawn);
  vec3 low = mix(nightLow, dawnLow, uDawn);
  vec3 col = mix(low, top, smoothstep(-0.05, 0.55, h));
  gl_FragColor = vec4(col, 1.0);
}`;

function shingleTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#1c1624';
  g.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 12) {
    const off = (y / 12) % 2 ? 8 : 0;
    for (let x = -16; x < 128; x += 16) {
      const l = 22 + Math.random() * 14;
      g.fillStyle = `rgb(${l + 6},${l},${l + 12})`;
      g.beginPath();
      g.moveTo(x + off + 1, y);
      g.lineTo(x + off + 15, y);
      g.lineTo(x + off + 15, y + 9);
      g.quadraticCurveTo(x + off + 8, y + 13, x + off + 1, y + 9);
      g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

// a four-sided hip roof over a w × d footprint
function hipRoof(w, d, h, mat) {
  const geo = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1, false, Math.PI / 4);
  const m = new THREE.Mesh(geo, mat);
  m.scale.set(w * 1.08, h, d * 1.08);
  m.castShadow = true;
  return m;
}

export class Exterior {
  constructor() {
    const scene = new THREE.Scene();
    this.scene = scene;
    scene.fog = new THREE.FogExp2(0x0a0a1a, 0.012);
    this.time = 0;
    this.dawn = 0;
    this.flash = 0;
    this.nextBolt = 4;
    this.glowTex = makeGlowTexture('#ffffff');

    // --- light
    this.hemi = new THREE.HemisphereLight(0x5a6aa8, 0x120c10, 0.55);
    scene.add(this.hemi);
    this.moon = new THREE.DirectionalLight(0x9ab0ff, 1.1);
    this.moon.position.set(-40, 60, 30);
    this.moon.castShadow = true;
    this.moon.shadow.mapSize.set(1024, 1024);
    const sc = this.moon.shadow.camera;
    sc.left = -40;
    sc.right = 40;
    sc.top = 40;
    sc.bottom = -20;
    sc.far = 160;
    scene.add(this.moon);
    this.bolt = new THREE.DirectionalLight(0xdde6ff, 0);
    this.bolt.position.set(30, 50, 40);
    scene.add(this.bolt);

    this.buildSky();
    this.buildGrounds();
    this.buildHouse();
    this.buildLife();
  }

  // ---------------------------------------------------------------
  buildSky() {
    const scene = this.scene;
    this.skyMat = new THREE.ShaderMaterial({ vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, uniforms: { uDawn: { value: 0 } }, side: THREE.BackSide, depthWrite: false, fog: false });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(190, 32, 16), this.skyMat);
    scene.add(sky);
    // stars
    const n = 900;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const y = 0.08 + Math.random() * 0.92;
      const r = Math.sqrt(1 - y * y);
      pos.set([Math.cos(a) * r * 180, y * 180, Math.sin(a) * r * 180], i * 3);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.1, sizeAttenuation: false, transparent: true, opacity: 0.85, fog: false, depthWrite: false });
    scene.add(new THREE.Points(sg, this.starMat));
    // the moon with a big soft halo
    const moonPos = V(-55, 62, -140);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(7, 32), new THREE.MeshBasicMaterial({ color: 0xfff6dc, fog: false }));
    disc.position.copy(moonPos);
    disc.lookAt(0, 10, 0);
    scene.add(disc);
    this.moonDisc = disc;
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: 0x9ab0ff, transparent: true, opacity: 0.55, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
    halo.scale.set(70, 70, 1);
    halo.position.copy(moonPos);
    scene.add(halo);
    this.halo = halo;
    // drifting clouds across the moon
    this.clouds = [];
    for (let i = 0; i < 9; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: 0x2a2a44, transparent: true, opacity: 0.55, depthWrite: false, fog: false }));
      s.scale.set(60 + Math.random() * 50, 14 + Math.random() * 8, 1);
      s.position.set(-150 + i * 38, 45 + Math.random() * 30, -130 - Math.random() * 30);
      s.userData.speed = 1.2 + Math.random() * 1.5;
      scene.add(s);
      this.clouds.push(s);
    }
  }

  buildGrounds() {
    const scene = this.scene;
    // a gentle hill
    const hill = new THREE.PlaneGeometry(260, 260, 60, 60);
    const p = hill.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const d = Math.hypot(x, y + 4);
      p.setZ(i, Math.max(-6, 2.2 - d * d * 0.0009) + Math.sin(x * 0.15) * Math.cos(y * 0.13) * 0.4 - 2.2);
    }
    hill.computeVertexNormals();
    const grass = std(0x1a2418, { roughness: 1 });
    const ground = new THREE.Mesh(hill, grass);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // the path from the gate to the porch
    const stoneTex = makeStoneTexture('#5a5560');
    stoneTex.repeat.set(1, 6);
    const path = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 22), std(0xffffff, { map: stoneTex, ...makeReliefMaps(stoneTex, { strength: 4, rough: 0.9 }), roughness: 1, flatShading: false }));
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, 0.03, 16.5);
    path.receiveShadow = true;
    scene.add(path);

    // wrought-iron fence and gate
    const iron = std(0x101014, { metalness: 0.6, roughness: 0.5 });
    const fence = new THREE.Group();
    // ~150 bars and spikes drawn as two instanced meshes (2 draw calls, not 300)
    const barXs = [];
    for (let x = -30; x <= 30; x += 0.8) if (Math.abs(x) >= 2.2) barXs.push(x);
    const bars = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 5), iron, barXs.length);
    const tips = new THREE.InstancedMesh(new THREE.ConeGeometry(0.09, 0.25, 4), iron, barXs.length);
    const mtx = new THREE.Matrix4();
    barXs.forEach((x, i) => {
      bars.setMatrixAt(i, mtx.makeTranslation(x, 1.1, 27.5));
      tips.setMatrixAt(i, mtx.makeTranslation(x, 2.3, 27.5));
    });
    fence.add(bars, tips);
    for (const y of [0.4, 1.9]) {
      for (const s of [-1, 1]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(28, 0.06, 0.06), iron);
        rail.position.set(s * 16.1, y, 27.5);
        fence.add(rail);
      }
    }
    const stone = std(0x4a4650);
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.7, 3.2, 0.7), stone);
      post.position.set(s * 2.2, 1.6, 27.5);
      post.castShadow = true;
      fence.add(post);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), stone);
      cap.position.set(s * 2.2, 3.5, 27.5);
      fence.add(cap);
      // gate lanterns
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 0.35), std(0xffd27a, { emissive: 0xffa040, emissiveIntensity: 3 }));
      lamp.position.set(s * 2.2, 4.2, 27.5);
      fence.add(lamp);
      const l = new THREE.PointLight(0xffa050, 6, 14, 1.8);
      l.position.set(s * 2.2, 4.2, 27.9);
      fence.add(l);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: 0xffa050, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
      glow.scale.set(2.6, 2.6, 1);
      glow.position.copy(lamp.position);
      fence.add(glow);
      // the gate leaves, open a crack
      const leaf = new THREE.Group();
      for (let k = 0; k < 6; k++) {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 5), iron);
        bar.position.set(-s * (0.15 + k * 0.32), 1.3, 0);
        leaf.add(bar);
      }
      leaf.position.set(s * 1.85, 0, 27.5);
      leaf.rotation.y = s * 0.35;
      fence.add(leaf);
    }
    scene.add(fence);

    // dead trees and leaning tombstones
    const bark = std(0x1a1210);
    const tree = (x, z, s) => {
      const t = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25 * s, 0.5 * s, 6 * s, 6), bark);
      trunk.position.y = 3 * s;
      t.add(trunk);
      for (let i = 0; i < 6; i++) {
        const br = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * s, 0.16 * s, 3 * s, 5), bark);
        const a = (i / 6) * Math.PI * 2 + Math.random();
        br.position.set(Math.cos(a) * 0.9 * s, (4 + Math.random() * 1.8) * s, Math.sin(a) * 0.9 * s);
        br.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
        t.add(br);
      }
      t.position.set(x, 0, z);
      t.rotation.y = Math.random() * 6;
      t.traverse((o) => { o.castShadow = true; });
      scene.add(t);
    };
    tree(-19, 18, 1.3);
    tree(21, 15, 1.1);
    tree(-27, 2, 1.5);
    tree(29, -2, 1.4);
    tree(-9, 24, 0.8);
    const grave = std(0x56525c);
    for (const [x, z, r] of [[-13, 20, 0.2], [-15.5, 22, -0.15], [-11, 23.5, 0.1], [13, 21, -0.25], [15.5, 23, 0.12]]) {
      const g = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.3, 0.25), grave);
      g.position.set(x, 0.6, z);
      g.rotation.set(r * 0.4, r, r * 0.3);
      g.castShadow = true;
      scene.add(g);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.25, 12, 1, false, 0, Math.PI), grave);
      top.rotation.set(Math.PI / 2 + r * 0.4, 0, Math.PI / 2 + r * 0.3);
      top.position.set(x, 1.25, z);
      scene.add(top);
    }
    // low ground mist
    this.mist = [];
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: 0x6a7090, transparent: true, opacity: 0.18, depthWrite: false }));
      m.scale.set(16, 3, 1);
      m.position.set((Math.random() - 0.5) * 60, 0.8, -5 + Math.random() * 32);
      m.userData.speed = 0.4 + Math.random() * 0.6;
      scene.add(m);
      this.mist.push(m);
    }
  }

  // ---------------------------------------------------------------
  buildHouse() {
    const scene = this.scene;
    const house = new THREE.Group();
    scene.add(house);
    this.house = house;
    const siding = makeWoodTexture('#3a2c40', 3);
    const sidingMat = (rx, ry) => {
      const t = siding.clone();
      t.repeat.set(rx, ry);
      t.rotation = 0;
      return std(0xffffff, { map: t, ...makeReliefMaps(t, { strength: 2.5, rough: 0.8 }), roughness: 1, flatShading: false });
    };
    const roofTex = shingleTexture();
    const roofMat = std(0xffffff, { map: roofTex, roughness: 0.9 });
    const trim = std(0xd8ccb0);
    const darkTrim = std(0x2a2030);
    const found = makeStoneTexture('#4a4650');
    found.repeat.set(6, 1);
    const foundMat = std(0xffffff, { map: found, ...makeReliefMaps(found, { strength: 4, rough: 0.9 }), roughness: 1, flatShading: false });

    const block = (w, h, d, x, z, y = 0) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), sidingMat(w / 4, h / 4));
      m.position.set(x, y + h / 2, z);
      m.castShadow = m.receiveShadow = true;
      house.add(m);
      const base = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 1.2, d + 0.4), foundMat);
      base.position.set(x, y + 0.6, z);
      base.receiveShadow = true;
      if (y === 0) house.add(base);
      // trim bands at each floor line and under the eaves
      for (const ty of [4.4, h - 0.2]) {
        if (ty >= h) continue;
        const band = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.22, d + 0.2), trim);
        band.position.set(x, y + ty, z);
        house.add(band);
      }
      return m;
    };
    // main house (3 floors), two wings, the painter's tower
    block(15, 12.5, 11, 0, 0);
    const mainRoof = hipRoof(15, 11, 6, roofMat);
    mainRoof.position.set(0, 12.5 + 3, 0);
    house.add(mainRoof);
    for (const s of [-1, 1]) {
      block(10, 8.5, 9, s * 12.5, -0.5);
      const r = hipRoof(10, 9, 4.2, roofMat);
      r.position.set(s * 12.5, 8.5 + 2.1, -0.5);
      house.add(r);
      // chimneys
      const ch = new THREE.Mesh(new THREE.BoxGeometry(1.1, 5, 1.1), foundMat);
      ch.position.set(s * 15.5, 10.5, -2.5);
      ch.castShadow = true;
      house.add(ch);
    }
    block(4.6, 21, 4.6, 5.2, -2.6);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(3.6, 8, 8), roofMat);
    spire.position.set(5.2, 21 + 4, -2.6);
    spire.castShadow = true;
    house.add(spire);
    const vane = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2, 4), std(0x8a7a3a, { metalness: 0.7 }));
    vane.position.set(5.2, 30, -2.6);
    house.add(vane);
    this.vaneArrow = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.3), vane.material);
    this.vaneArrow.position.set(5.2, 30.6, -2.6);
    house.add(this.vaneArrow);
    // gable over the front door
    const gable = new THREE.Mesh(new THREE.ConeGeometry(3.4, 3, 3, 1), roofMat);
    gable.rotation.set(0, Math.PI, 0);
    gable.scale.set(1, 1, 0.45);
    gable.position.set(0, 14.2, 5.6);
    house.add(gable);

    // porch: steps, columns, roof
    for (let i = 0; i < 4; i++) {
      const st = new THREE.Mesh(new THREE.BoxGeometry(5.5 - i * 0.2, 0.3, 1.0), std(0x6a6470));
      st.position.set(0, 0.15 + i * 0.3, 8.6 - i * 0.6);
      st.receiveShadow = true;
      house.add(st);
    }
    const deck = new THREE.Mesh(new THREE.BoxGeometry(8, 1.2, 3), std(0x4a3a30));
    deck.position.set(0, 0.6, 6.6);
    house.add(deck);
    for (const x of [-3.6, -1.6, 1.6, 3.6]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 3.6, 10), trim);
      col.position.set(x, 3, 7.8);
      col.castShadow = true;
      house.add(col);
    }
    const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.3, 3.6), darkTrim);
    porchRoof.position.set(0, 4.9, 6.9);
    porchRoof.rotation.x = 0.12;
    house.add(porchRoof);
    // front double door
    const doorMat = std(0x3a1a0c, { roughness: 0.6 });
    this.doors = [];
    for (const s of [-1, 1]) {
      const hinge = new THREE.Group();
      hinge.position.set(s * 1.3, 1.2, 5.56);
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.3, 3, 0.12), doorMat);
      leaf.position.set(-s * 0.65, 1.5, 0);
      hinge.add(leaf);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), std(0xd6a647, { metalness: 0.8 }));
      knob.position.set(-s * 1.1, 1.5, 0.1);
      hinge.add(knob);
      house.add(hinge);
      this.doors.push({ hinge, s });
    }
    // warm light inside the doorway (only seen when the door opens)
    this.doorLight = new THREE.PointLight(0xffb060, 0, 10, 1.6);
    this.doorLight.position.set(0, 2.6, 4.6);
    house.add(this.doorLight);
    const doorway = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3), new THREE.MeshBasicMaterial({ color: 0x0a0608 }));
    doorway.position.set(0, 2.7, 5.52);
    house.add(doorway);
    this.doorway = doorway;

    // --- windows, grouped by area
    this.windows = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    const frameMat = std(0xd8ccb0);
    const frameParts = [];
    const hoodParts = [];
    const win = (area, x, y, z, w = 1.4, h = 2.2, ry = 0) => {
      const g = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: 0x0c1020, emissive: 0x000000, roughness: 0.15, metalness: 0.3 });
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      g.add(glass);
      // frame pieces and hoods are collected and drawn as instanced meshes below
      const fr = (fw, fh, fx, fy) => frameParts.push({ g, w: fw, h: fh, x: fx, y: fy });
      fr(w + 0.3, 0.16, 0, h / 2 + 0.08);
      fr(w + 0.4, 0.2, 0, -h / 2 - 0.1);
      fr(0.14, h, -w / 2 - 0.07, 0);
      fr(0.14, h, w / 2 + 0.07, 0);
      fr(0.07, h, 0, 0);
      fr(w, 0.07, 0, h * 0.1);
      hoodParts.push({ g, w, y: h / 2 + 0.45 });
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: 0xffb060, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      glow.scale.set(w * 2.6, h * 1.8, 1);
      glow.position.z = 0.25;
      g.add(glow);
      g.position.set(x, y, z);
      g.rotation.y = ry;
      house.add(g);
      const entry = { group: g, mat, glow, lit: 0, target: 0, area, flick: Math.random() * 10, color: new THREE.Color(0xffb060) };
      this.windows[area].push(entry);
      return entry;
    };
    const fz = 5.52;
    // ground floor of the main house (area 1)
    for (const x of [-5.5, -3.2, 3.2, 5.5]) win(1, x, 2.9, fz);
    // upper floors of the main house (area 3)
    for (const x of [-5.5, -2.4, 0, 2.4, 5.5]) win(3, x, 7.2, fz);
    for (const x of [-4, 4]) win(3, x, 10.6, fz, 1.2, 1.8);
    win(3, 0, 12.4, 5.75, 1.0, 1.4); // the little gable window
    // the wings (area 2 west, area 4 east)
    for (const s of [-1, 1]) {
      const area = s < 0 ? 2 : 4;
      for (const x of [-2.6, 0, 2.6]) {
        win(area, s * 12.5 + x, 2.9, 4.02);
        win(area, s * 12.5 + x, 6.4, 4.02, 1.2, 1.8);
      }
    }
    // cellar slits in the foundation (area 4)
    for (const x of [-6, -2, 2, 6]) win(4, x, 0.65, 5.6, 1.0, 0.4);
    // the painter's tower (area 5): sickly purple until Varnish is caught
    for (const y of [16, 19.2]) {
      const w = win(5, 5.2, y, -0.28, 1.2, 1.9);
      w.color.set(0xb070ff);
    }
    const tw = win(5, 5.2 + 2.32, 19.2, -2.6, 1.2, 1.9, Math.PI / 2);
    tw.color.set(0xb070ff);

    // every window frame piece and hood in two instanced draws
    const frames = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), frameMat, frameParts.length);
    const hoods = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 0.55, 3), darkTrim, hoodParts.length);
    const m4 = new THREE.Matrix4();
    const local = new THREE.Matrix4();
    frameParts.forEach((p, i) => {
      p.g.updateMatrix();
      local.compose(new THREE.Vector3(p.x, p.y, 0.03), new THREE.Quaternion(), new THREE.Vector3(p.w, p.h, 0.14));
      frames.setMatrixAt(i, m4.multiplyMatrices(p.g.matrix, local));
    });
    hoodParts.forEach((p, i) => {
      local.compose(new THREE.Vector3(0, p.y, 0.05), new THREE.Quaternion(), new THREE.Vector3(0.3 * 0.62 * p.w, 1, 0.62 * p.w));
      hoods.setMatrixAt(i, m4.multiplyMatrices(p.g.matrix, local));
    });
    house.add(frames, hoods);
  }

  // bats round the tower, ghosts behind the dark windows
  buildLife() {
    const scene = this.scene;
    this.bats = [];
    const batMat = new THREE.MeshBasicMaterial({ color: 0x050308, side: THREE.DoubleSide });
    for (let i = 0; i < 9; i++) {
      const bat = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), batMat);
      bat.add(body);
      const wingGeo = new THREE.BufferGeometry();
      wingGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 0.7, 0.1, -0.15, 0.35, -0.05, 0.25]), 3));
      const l = new THREE.Mesh(wingGeo, batMat);
      const r = new THREE.Mesh(wingGeo, batMat);
      r.scale.x = -1;
      bat.add(l, r);
      bat.userData = { l, r, phase: Math.random() * 10, rad: 5 + Math.random() * 6, h: 18 + Math.random() * 8, speed: 0.5 + Math.random() * 0.5 };
      scene.add(bat);
      this.bats.push(bat);
    }
    // ghost faces drifting past unlit windows
    this.peekers = [];
    const kinds = ['blue', 'pink', 'green', 'white', 'gold', 'purple'];
    const all = Object.values(this.windows).flat().filter((w) => w.area !== 5 && w.group.position.y > 1.5);
    for (let i = 0; i < 6; i++) {
      const g = buildGhost(kinds[i]);
      g.group.scale.setScalar(0.55);
      g.group.visible = false;
      scene.add(g.group);
      this.peekers.push({ g, win: null, t: Math.random() * 4, all });
    }
    // Master Varnish's silhouette in the tower studio
    const v = buildGhost('varnish');
    v.group.scale.setScalar(0.5);
    v.group.position.set(5.2, 18.6, 0.05);
    v.group.visible = true;
    scene.add(v.group);
    this.varnish = v;
  }

  // ---------------------------------------------------------------
  // which areas have their lights back on (instant = no fade-in)
  setLit(areas, instant = false) {
    for (const [area, list] of Object.entries(this.windows)) {
      const on = areas.includes(+area);
      for (const w of list) {
        w.target = on ? 1 : 0;
        if (instant) w.lit = w.target;
      }
    }
  }

  // light one area's windows one after another
  lightArea(area, over = 1.6) {
    const list = this.windows[area] || [];
    list.forEach((w, i) => setTimeout(() => { w.target = 1; }, (i / Math.max(1, list.length)) * over * 1000));
  }

  setDawn(d) {
    this.dawn = d;
  }

  openDoors(k) {
    for (const d of this.doors) d.hinge.rotation.y = d.s * k * 1.4;
    this.doorLight.intensity = k * 8;
  }

  update(dt, sound) {
    this.time += dt;
    const t = this.time;
    this.skyMat.uniforms.uDawn.value = this.dawn;
    this.starMat.opacity = 0.85 * (1 - this.dawn);
    this.halo.material.opacity = 0.55 * (1 - this.dawn * 0.7);
    this.scene.fog.color.setRGB(0.04 + this.dawn * 0.35, 0.04 + this.dawn * 0.22, 0.1 + this.dawn * 0.15);
    this.hemi.intensity = 0.55 + this.dawn * 0.9;
    this.moon.color.setRGB(0.6 + this.dawn * 0.4, 0.69 + this.dawn * 0.1, 1 - this.dawn * 0.35);

    for (const c of this.clouds) {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 160) c.position.x = -160;
    }
    for (const m of this.mist) {
      m.position.x += m.userData.speed * dt;
      if (m.position.x > 34) m.position.x = -34;
    }
    this.vaneArrow.rotation.y = Math.sin(t * 0.4) * 1.2;

    // lightning (not after dawn)
    this.nextBolt -= dt;
    if (this.nextBolt <= 0 && this.dawn < 0.3) {
      this.nextBolt = 6 + Math.random() * 8;
      this.flash = 1;
      if (sound) setTimeout(() => sound.thunder(), 250 + Math.random() * 500);
    }
    this.flash = Math.max(0, this.flash - dt * 3);
    const strobe = this.flash > 0.5 ? this.flash : this.flash * (Math.sin(t * 60) > 0 ? 1 : 0.3);
    this.bolt.intensity = strobe * 5;

    // windows: glow toward their target with a candle flicker
    for (const list of Object.values(this.windows)) {
      for (const w of list) {
        w.lit += (w.target - w.lit) * Math.min(1, dt * 3);
        const f = 0.85 + Math.sin(t * 7 + w.flick) * 0.08 + Math.sin(t * 17 + w.flick * 2) * 0.05;
        w.mat.emissive.copy(w.color).multiplyScalar(w.lit * 2.2 * f);
        w.glow.material.color.copy(w.color);
        w.glow.material.opacity = w.lit * 0.55 * f;
      }
    }
    // the tower stays haunted (purple) until the very end
    for (const w of this.windows[5]) {
      if (w.target === 0) {
        w.mat.emissive.setRGB(0.25, 0.08, 0.45).multiplyScalar(0.8 + Math.sin(t * 2.3) * 0.3);
        w.glow.material.color.set(0xb070ff);
        w.glow.material.opacity = 0.3;
      }
    }
    if (this.varnish) {
      this.varnish.group.visible = this.windows[5][0].target === 0;
      this.varnish.group.position.x = 5.2 + Math.sin(t * 0.7) * 0.4;
      this.varnish.group.position.y = 18.6 + Math.sin(t * 1.3) * 0.12;
    }

    for (const b of this.bats) {
      const u = b.userData;
      const a = t * u.speed + u.phase;
      b.position.set(5.2 + Math.cos(a) * u.rad, u.h + Math.sin(a * 2.3) * 1.2 - this.dawn * 30, -2.6 + Math.sin(a) * u.rad);
      b.rotation.y = -a;
      const flap = Math.sin(t * 18 + u.phase) * 0.9;
      u.l.rotation.z = flap;
      u.r.rotation.z = -flap;
    }

    // ghosts peek through windows that are still dark
    for (const p of this.peekers) {
      p.t -= dt;
      if (p.t <= 0) {
        const dark = p.all.filter((w) => w.target === 0);
        p.win = dark.length && Math.random() < 0.8 ? dark[Math.floor(Math.random() * dark.length)] : null;
        p.t = 2.5 + Math.random() * 3;
        p.life = p.t;
      }
      const g = p.g.group;
      g.visible = !!p.win;
      if (!p.win) continue;
      const k = 1 - p.t / p.life;
      const wp = p.win.group.getWorldPosition(new THREE.Vector3());
      const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(p.win.group.getWorldQuaternion(new THREE.Quaternion()));
      g.position.copy(wp).addScaledVector(dir, -0.12); // just against the glass
      g.position.x += (k - 0.5) * 1.0;
      g.position.y -= 0.35;
      g.rotation.y = Math.atan2(-dir.x, -dir.z);
      const o = Math.sin(k * Math.PI);
      p.g.bodyMat.opacity = 0.6 * o;
      if (p.g.armMat) p.g.armMat.opacity = 0.6 * o;
      p.g.glow.material.opacity = 0.35 * o;
      if (p.g.eyeGlow) p.g.eyeGlow.material.opacity = 0.7 * o;
      if (p.g.animate) p.g.animate(t, dt);
    }
  }
}
