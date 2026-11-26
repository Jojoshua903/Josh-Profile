// Ridgeline extra physics: Rapier ragdolls and kickable props.
// The game tries to load Rapier at start. If it can't (Dia's preview blocks outside libraries),
// everything here quietly does nothing and the game keeps its built-in physics.
// Add ?builtin to the URL to force the built-in physics anywhere.
import { THREE, C, CX, GRID, scene, maze, rng } from './world.js';

const RAPIER_URL = 'https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.14.0/rapier.es.js';
let R = null, world = null, acc = 0, mode = 'builtin';
export const physicsMode = () => mode;

const G_WORLD = 1, G_PROP = 2, G_PLAYER = 4, G_RAG = 8;
const grp = (member, filter) => (member << 16) | filter;

export async function initPhysics() {
  if (new URLSearchParams(location.search).has('builtin')) return mode = 'builtin';
  try {
    const mod = await Promise.race([import(RAPIER_URL), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000))]);
    R = mod.default || mod;
    await R.init();
    mode = 'rapier';
  } catch (e) {
    console.info('Rapier not available here, using built-in physics.', e?.message || e);
    mode = 'builtin';
  }
  return mode;
}

let doorBodies = [], props = [];
const rags = new Map(), kinematic = new Map();

export function physClear() {
  props.forEach((p) => scene.remove(p.mesh)); props = [];
  for (const id of [...rags.keys()]) removeRagdoll(id);
  kinematic.clear(); doorBodies = [];
  if (world) { world.free(); world = null; }
}

/** Rebuild the physics world for a new maze. */
export function physRebuild(seed) {
  physClear();
  if (mode !== 'rapier' || !maze) return;
  world = new R.World({ x: 0, y: -18, z: 0 });
  const fixed = world.createRigidBody(R.RigidBodyDesc.fixed());
  const solid = (desc) => world.createCollider(desc.setCollisionGroups(grp(G_WORLD, 0xffff)).setFriction(.9), fixed);
  solid(R.ColliderDesc.cuboid(300, .5, 300).setTranslation(CX, -.5, CX));
  for (let x = 0; x < GRID; x++) for (let z = 0; z < GRID; z++) if (maze.g[x][z]) {
    const h = maze.top[x][z]; solid(R.ColliderDesc.cuboid(C / 2, h / 2, C / 2).setTranslation(x * C + C / 2, h / 2, z * C + C / 2));
  } else if (maze.low[x][z]) {
    const h = maze.low[x][z]; solid(R.ColliderDesc.cuboid(C / 2, h / 2, C / 2).setTranslation(x * C + C / 2, h / 2, z * C + C / 2));
  } else if (maze.bridge[x][z]) {
    solid(R.ColliderDesc.cuboid(C / 2, .27, C / 2).setTranslation(x * C + C / 2, maze.bridge[x][z] - .27, z * C + C / 2));
  }
  for (const d of maze.doors) {
    const x = d.i * C + C / 2, z = d.j * C + C / 2;
    const body = world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(x, d.h / 2, z));
    world.createCollider(R.ColliderDesc.cuboid(C * .49, d.h / 2, C * .49).setCollisionGroups(grp(G_WORLD, 0xffff)), body);
    doorBodies.push({ d, body, x, z });
  }
  // supply crates and snowballs scattered in the corridors
  const r = rng(seed ^ 0x51ed27), mid = (GRID - 1) / 2;
  const crateGeo = new THREE.BoxGeometry(.7, .7, .7), crateMat = new THREE.MeshStandardMaterial({ color: 0xb07a43, roughness: .85, flatShading: true });
  const lidMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .6 }), lidGeo = new THREE.BoxGeometry(.74, .1, .74);
  const ballGeo = new THREE.IcosahedronGeometry(.32, 1), ballMat = new THREE.MeshStandardMaterial({ color: 0xf8fbff, roughness: .5, flatShading: true });
  const puzzleTiles = new Set(); for (const d of maze.doors) [...(d.braziers || []), ...(d.runes || []).map((u) => [u.i, u.j])].forEach(([a, b]) => puzzleTiles.add(a + ',' + b)); // keep crates off braziers and rune tiles
  if (!maze.lobby) for (let x = 1; x < GRID - 1; x += 2) for (let z = 1; z < GRID - 1; z += 2) {
    if ((x <= 3 && z <= 3) || (Math.abs(x - mid) <= 2 && Math.abs(z - mid) <= 2) || maze.low[x][z] || r() > .16 || puzzleTiles.has(x + ',' + z)) continue;
    const crate = r() < .55, px = x * C + C / 2 + (r() - .5) * 2, pz = z * C + C / 2 + (r() - .5) * 2;
    const body = world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(px, crate ? .36 : .33, pz).setLinearDamping(.4).setAngularDamping(crate ? .5 : .2));
    world.createCollider((crate ? R.ColliderDesc.cuboid(.35, .35, .35).setDensity(.6) : R.ColliderDesc.ball(.32).setDensity(.4)).setRestitution(crate ? .1 : .3).setFriction(.8).setCollisionGroups(grp(G_PROP, G_WORLD | G_PROP | G_PLAYER | G_RAG)), body);
    let mesh;
    if (crate) { mesh = new THREE.Mesh(crateGeo, crateMat); const lid = new THREE.Mesh(lidGeo, lidMat); lid.position.y = .38; mesh.add(lid); }
    else mesh = new THREE.Mesh(ballGeo, ballMat);
    mesh.castShadow = true; scene.add(mesh); props.push({ body, mesh });
  }
}

/** people: [{id, x, y, z, down}] — every climber becomes an invisible capsule that shoves props around. */
export function physStep(dt, people) {
  if (!world) return;
  for (const b of doorBodies) b.body.setNextKinematicTranslation({ x: b.x, y: b.d.h / 2 - b.d.progress * (b.d.h + .05), z: b.z });
  const seen = new Set();
  for (const p of people) {
    let b = kinematic.get(p.id);
    if (p.down) { if (b) { world.removeRigidBody(b); kinematic.delete(p.id); } continue; }
    seen.add(p.id);
    if (!b) {
      b = world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(p.x, p.y + .8, p.z));
      world.createCollider(R.ColliderDesc.capsule(.45, .34).setCollisionGroups(grp(G_PLAYER, G_PROP | G_RAG)), b);
      kinematic.set(p.id, b);
    }
    b.setNextKinematicTranslation({ x: p.x, y: p.y + .8, z: p.z });
  }
  for (const [id, b] of kinematic) if (!seen.has(id)) { world.removeRigidBody(b); kinematic.delete(id); }
  acc += Math.min(dt, .1);
  for (let n = 0; acc >= 1 / 60 && n < 4; n++) { world.step(); acc -= 1 / 60; }
  const sync = (body, mesh) => { const t = body.translation(), q = body.rotation(); mesh.position.set(t.x, t.y, t.z); mesh.quaternion.set(q.x, q.y, q.z, q.w); };
  props.forEach((p) => sync(p.body, p.mesh));
  for (const r of rags.values()) r.parts.forEach((p) => sync(p.body, p.mesh));
}

/** Turn a climber into a floppy ragdoll. Returns false when Rapier isn't running. */
export function spawnRagdoll(id, p) {
  if (!world) return false;
  removeRagdoll(id);
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.yaw || 0);
  const base = new THREE.Vector3(p.x, p.y || 0, p.z), rot = { x: q.x, y: q.y, z: q.z, w: q.w };
  const jacket = new THREE.MeshStandardMaterial({ color: p.color, roughness: .75 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x27303b, roughness: .8 }), skin = new THREE.MeshStandardMaterial({ color: p.skin || 0xf0c7a0 });
  const parts = [];
  const part = (lx, ly, lz, desc, mesh) => {
    const w = new THREE.Vector3(lx, ly, lz).applyQuaternion(q).add(base);
    const body = world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(w.x, w.y, w.z).setRotation(rot).setLinearDamping(.15).setAngularDamping(.8));
    world.createCollider(desc.setCollisionGroups(grp(G_RAG, G_WORLD | G_PROP | G_PLAYER)).setFriction(.9).setRestitution(.05).setDensity(1.2), body);
    mesh.castShadow = true; scene.add(mesh); parts.push({ body, mesh });
    return body;
  };
  const torso = part(0, 1.1, 0, R.ColliderDesc.capsule(.3, .3), new THREE.Mesh(new THREE.CapsuleGeometry(.3, .6, 4, 12), jacket));
  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(.24, 16, 12), skin);
  const hat = new THREE.Mesh(new THREE.SphereGeometry(.26, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), jacket); hat.position.y = .05; headMesh.add(hat);
  const head = part(0, 1.79, 0, R.ColliderDesc.ball(.24), headMesh);
  const limb = (lx, ly, hh, r, mat) => part(lx, ly, 0, R.ColliderDesc.capsule(hh, r), new THREE.Mesh(new THREE.CapsuleGeometry(r, hh * 2, 3, 8), mat));
  const armL = limb(-.4, 1.14, .2, .09, jacket), armR = limb(.4, 1.14, .2, .09, jacket);
  const legL = limb(-.15, .4, .2, .1, dark), legR = limb(.15, .4, .2, .1, dark);
  const joint = (a, b, pa, pb) => world.createImpulseJoint(R.JointData.spherical(pa, pb), a, b, true);
  joint(torso, head, { x: 0, y: .45, z: 0 }, { x: 0, y: -.24, z: 0 });
  joint(torso, armL, { x: -.4, y: .32, z: 0 }, { x: 0, y: .28, z: 0 });
  joint(torso, armR, { x: .4, y: .32, z: 0 }, { x: 0, y: .28, z: 0 });
  joint(torso, legL, { x: -.15, y: -.4, z: 0 }, { x: 0, y: .3, z: 0 });
  joint(torso, legR, { x: .15, y: -.4, z: 0 }, { x: 0, y: .3, z: 0 });
  // topple forward with whatever momentum the climber had
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
  torso.setLinvel({ x: (p.vx || 0) + fwd.x * 1.5, y: .5, z: (p.vz || 0) + fwd.z * 1.5 }, true);
  head.setLinvel({ x: fwd.x * 3, y: 0, z: fwd.z * 3 }, true);
  torso.setAngvel({ x: (Math.random() - .5) * 4, y: (Math.random() - .5) * 2, z: (Math.random() - .5) * 4 }, true);
  rags.set(id, { parts, head });
  return true;
}
export function ragdollHead(id) { const r = rags.get(id); return r ? r.head.translation() : null; }
export function removeRagdoll(id) {
  const r = rags.get(id); if (!r) return;
  r.parts.forEach((p) => { scene.remove(p.mesh); if (world) world.removeRigidBody(p.body); });
  rags.delete(id);
}
