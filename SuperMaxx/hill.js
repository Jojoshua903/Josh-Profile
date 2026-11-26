import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { HILL } from './data.js?v=20261127j';
import { ring, burst, TEAM_COLOR } from './units.js?v=20261127j';

// Hill Rush: 3v3 king of the hill on the lane stages. A team scores while it has the ring
// to itself; anyone from both teams inside means contested. The ring hops around the map.

const NEUTRAL = 0xfff3c4, CONTEST = 0xffc93c;

export function initHill(G) {
  const pts = G.map.hills;
  const root = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CircleGeometry(HILL.radius, 48),
    new THREE.MeshBasicMaterial({ color: NEUTRAL, transparent: true, opacity: 0.28, depthWrite: false }));
  disc.rotation.x = -Math.PI / 2; disc.position.y = 0.06;
  const edge = new THREE.Mesh(new THREE.TorusGeometry(HILL.radius, 0.14, 6, 64), new THREE.MeshBasicMaterial({ color: NEUTRAL }));
  edge.rotation.x = Math.PI / 2; edge.position.y = 0.15;
  // a tall beam so the hill reads from anywhere on the map
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.4, 34, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: NEUTRAL, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false, fog: false }));
  beam.position.y = 17;
  const crown = new THREE.Mesh(new THREE.OctahedronGeometry(0.9, 0), new THREE.MeshStandardMaterial({ color: NEUTRAL, emissive: NEUTRAL, emissiveIntensity: 0.6, flatShading: true }));
  crown.position.y = 5.5; crown.scale.y = 1.4;
  // progress ring on the ground fills with the holder's colour
  const fill = new THREE.Mesh(new THREE.RingGeometry(HILL.radius - 0.7, HILL.radius - 0.2, 64, 1, 0, 0.001),
    new THREE.MeshBasicMaterial({ color: NEUTRAL, side: THREE.DoubleSide, transparent: true, opacity: 0.9, depthWrite: false }));
  fill.rotation.x = -Math.PI / 2; fill.position.y = 0.1;
  root.add(disc, edge, beam, crown, fill);
  G.scene.add(root);
  G.hill = { pts, idx: 0, pos: new THREE.Vector3(pts[0][0], 0, pts[0][1]), r: HILL.radius, moveT: HILL.rotate,
    pts2: { blue: 0, red: 0 }, owner: null, contested: false, count: { blue: 0, red: 0 }, warned: false,
    mesh: { root, disc, edge, beam, crown, fill } };
  root.position.copy(G.hill.pos);
}

export const onHill = (G, h) => h.alive && Math.hypot(h.pos.x - G.hill.pos.x, h.pos.z - G.hill.pos.z) < G.hill.r && h.pos.y < 3;

function moveHill(G, idx = (G.hill.idx + 1) % G.hill.pts.length) {
  const H = G.hill;
  H.idx = idx;
  const [x, z] = H.pts[H.idx];
  burst(G, H.pos.clone().setY(1), 0xffffff, 3);
  H.pos.set(x, 0, z); H.mesh.root.position.copy(H.pos);
  ring(G, H.pos, 0xffc93c, H.r * 1.6);
  H.moveT = HILL.rotate; H.warned = false; H.owner = null;
  G.ev.hill?.('move', H);
}

// Offline and on the online host: score the hill, then draw it.
export function updateHill(G, dt) {
  const H = G.hill;
  if (G.over) return;
  H.count.blue = 0; H.count.red = 0;
  for (const h of G.heroes) if (onHill(G, h)) H.count[h.team]++;
  const { blue, red } = H.count;
  H.contested = blue > 0 && red > 0;
  const holder = H.contested ? null : blue ? 'blue' : red ? 'red' : null;
  if (holder && holder !== H.owner) G.ev.hill?.('capture', H, holder);
  if (H.contested && !H.wasContested) G.ev.hill?.('contest', H);
  H.wasContested = H.contested;
  if (holder) {
    H.owner = holder;
    H.pts2[holder] = Math.min(HILL.target, H.pts2[holder] + dt * HILL.rate * (1 + HILL.extra * (H.count[holder] - 1)));
    if (H.pts2[holder] >= HILL.target) { G.ev.hill?.('win', H, holder); return; }
  }
  H.moveT -= dt;
  if (!H.warned && H.moveT <= HILL.warn) { H.warned = true; G.ev.hill?.('soon', H); }
  if (H.moveT <= 0) moveHill(G);
  hillVisuals(G, dt);
}

// Online guests: take the host's hill state and fire the same banners locally.
export function netHill(G, s) {
  const H = G.hill;
  if (!H || G.over) return;
  if (s.i !== H.idx) moveHill(G, s.i);
  H.pts2.blue = s.b; H.pts2.red = s.r; H.moveT = s.m;
  H.count.blue = s.cb || 0; H.count.red = s.cr || 0; H.contested = !!s.c;
  const holder = H.contested ? null : H.count.blue ? 'blue' : H.count.red ? 'red' : null;
  if (holder && holder !== H.owner) G.ev.hill?.('capture', H, holder);
  if (H.contested && !H.wasContested) G.ev.hill?.('contest', H);
  H.wasContested = H.contested;
  H.owner = s.o || null;
  if (!H.warned && H.moveT <= HILL.warn) { H.warned = true; G.ev.hill?.('soon', H); }
}

export function hillVisuals(G, dt) {
  const H = G.hill;
  const holder = H.contested ? null : H.count.blue ? 'blue' : H.count.red ? 'red' : null;
  // visuals: colour by who's scoring, pulse when contested
  const m = H.mesh, t = G.time;
  const c = H.contested ? (Math.sin(t * 14) > 0 ? CONTEST : 0xffffff) : holder ? TEAM_COLOR[holder] : H.owner ? TEAM_COLOR[H.owner] : NEUTRAL;
  for (const o of [m.disc, m.edge, m.beam, m.crown, m.fill]) o.material.color.setHex(c);
  m.crown.material.emissive.setHex(c);
  m.disc.material.opacity = holder ? 0.38 + Math.sin(t * 5) * 0.06 : 0.24;
  m.crown.rotation.y += dt * (holder ? 2.4 : 0.8);
  m.crown.position.y = 5.5 + Math.sin(t * 1.8) * 0.3;
  m.edge.scale.setScalar(1 + Math.sin(t * 3) * 0.01);
  const lead = H.owner ? H.pts2[H.owner] / HILL.target : 0;
  m.fill.geometry.dispose();
  m.fill.geometry = new THREE.RingGeometry(HILL.radius - 0.7, HILL.radius - 0.2, 64, 1, Math.PI / 2, Math.max(0.001, lead * Math.PI * 2));
  // warn by flickering the beam before a move
  m.beam.material.opacity = H.moveT < HILL.warn ? 0.12 + (Math.sin(t * 10) > 0 ? 0.2 : 0) : 0.22;
}

// Where a bot with nothing better to do should stand: a personal spot inside the ring.
export function hillGoal(G, b, goal) {
  const H = G.hill, ai = b.ai;
  if (!ai.hillOff || ai.hillIdx !== H.idx || Math.random() < 0.004) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * H.r * 0.7;
    ai.hillOff = [Math.cos(a) * r, Math.sin(a) * r]; ai.hillIdx = H.idx;
  }
  goal.set(H.pos.x + ai.hillOff[0], 0, H.pos.z + ai.hillOff[1]);
  return Math.hypot(b.pos.x - H.pos.x, b.pos.z - H.pos.z);
}
