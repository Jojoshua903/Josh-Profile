import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { makeBox, resolveXZ, hasLOS, groundAt, rayWorld } from './world.js?v=20261126a';
import { buildHeroModel } from './models.js?v=20261126a';
import { damage, trace, tracer, burst, ring, setBar, makeBar, eyeOf, dirFrom, chestOf, spawnProjectile, TEAM_COLOR } from './units.js?v=20261126a';

// Abilities, status effects, zones, traps, walls and deployables.
// Each ability: cast(G, h, a, ctx) -> bool, ai(G, bot, a, ctx) -> bool (should the bot cast now?).

const v = new THREE.Vector3();
const enemiesOf = (G, h) => G.heroes.filter(e => e.alive && e.team !== h.team);
const alliesOf = (G, h) => G.heroes.filter(e => e.alive && e.team === h.team);
const flat = d => new THREE.Vector3(d.x, 0, d.z).normalize();

// ---------- status ----------
export function resetStatus(h) {
  Object.assign(h, { slowT: 0, slowM: 1, stunT: 0, rootT: 0, hasteT: 0, hasteSpeed: 1, hasteFire: 1, markT: 0, markAmp: 1, lurkT: 0, rushT: 0, rallyT: 0, rallyAmp: 1, jamT: 0, grabbed: null,
    invisT: 0, ambush: 1, barrierT: 0, barrierM: 1, noReloadT: 0, knockT: 0, dashT: 0, slamPending: false, airT: 0,
    zoneSlow: 1, zoneMult: 1, glideT: 0, momentum: 0, overdriveT: 0, megaT: 0, burnT: 0, ejected: false, photoOn: false, tunnelCd: 0, twirlT: 0 });
  h.cd = { q: 0, ability: 0 };
  h.hist = []; h.histT = 0;
}
export const canAct = h => h.stunT <= 0 && !(h.lurkT > 0);   // no shooting or casting while lurking in the mud
export const canMove = h => h.stunT <= 0 && h.rootT <= 0;
export const moveMult = h => (pasId(h) === 'snowboots' ? 1 : (h.slowT > 0 ? h.slowM : 1) * h.zoneSlow) * (h.hasteT > 0 ? h.hasteSpeed : 1);
export const fireMult = h => (h.hasteT > 0 ? h.hasteFire : 1);
export function takenMult(h) {
  return (h.barrierT > 0 ? h.barrierM : 1) * h.zoneMult * (h.markT > 0 ? h.markAmp : 1) * (h.lurkT > 0 ? 0.15 : 1) * passiveTaken(h);
}
export const isHidden = h => h.invisT > 0;

export function stun(u, t) { if (u.kind === 'hero') { u.stunT = Math.max(u.stunT, t); breakInvis(u); } else if (u.kind === 'minion') u.stunT = Math.max(u.stunT || 0, t); }
export function root(u, t) { if (u.kind === 'hero') u.rootT = Math.max(u.rootT, t); else if (u.kind === 'minion') u.stunT = Math.max(u.stunT || 0, t); }
export function slow(u, mult, t) { if (u.kind === 'hero' && pasId(u) !== 'snowboots') { u.slowT = Math.max(u.slowT, t); u.slowM = Math.min(u.slowT > 0 ? u.slowM : 1, mult); } }
export function knock(u, dir, force, up = 5) {
  if (u.kind !== 'hero' && u.kind !== 'minion') return;
  if (!u.vel) return;
  if (pasId(u) === 'ballast') { force *= u.def.passive.knock; up *= 0.5; }      // Bulwark barely budges
  u.vel.x = dir.x * force; u.vel.z = dir.z * force; u.vel.y = up;
  u.knockT = 0.45;
}
export function breakInvis(h) { if (h.invisT > 0) { h.invisT = 0; } }

export function tickStatus(G, h, dt) {
  tickPassive(G, h, dt);
  for (const k of ['slowT', 'stunT', 'rootT', 'hasteT', 'markT', 'invisT', 'barrierT', 'noReloadT', 'knockT', 'rushT', 'rallyT', 'jamT', 'overdriveT', 'megaT', 'tunnelCd']) if (h[k] > 0) h[k] -= dt;
  // Torque: moving fills momentum, standing around drains it; Overdrive keeps it full
  const mw = h.def.weapon;
  if (mw.mode === 'melee') {
    const sp = Math.hypot(h.vel.x, h.vel.z);
    h.momentum = h.overdriveT > 0 ? 100 : sp > 2 ? Math.min(100, h.momentum + sp * mw.build * dt) : Math.max(0, h.momentum - mw.decay * dt);
  }
  if (h.lurkT > 0 && (h.lurkT -= dt) <= 0) lurkBurst(G, h);
  h.cd.q = Math.max(0, h.cd.q - dt); h.cd.ability = Math.max(0, h.cd.ability - dt);
  h.ult = Math.min(100, h.ult + dt * 0.6);
  if (h.invisT <= 0) h.ambush = 1;
  // updraft glide: fall slowly until landing or the timer runs out
  if (h.glideT > 0) {
    h.glideT -= dt;
    if (h.vel.y < -2.5) h.vel.y = -2.5;
    if (h.onGround && h.vel.y <= 0 && h.airT === 0) h.glideT = 0;
  }
  // rewind keeps ~3s of breadcrumbs
  if (h.def.ability.id === 'rewind') {
    h.histT -= dt;
    if (h.histT <= 0) {
      h.histT = 0.1;
      h.hist.push({ x: h.pos.x, y: h.pos.y, z: h.pos.z, hp: h.hp, t: G.time });
      while (h.hist.length && h.hist[0].t < G.time - h.def.ability.back - 0.2) h.hist.shift();
    }
  }
  // dashes: bobsled (bowls everyone over), death roll (grabs one), joust (launches one)
  if (h.dashT > 0) {
    h.dashT -= dt;
    h.vel.x = h.dashDir.x * h.dashSpeed; h.vel.z = h.dashDir.z * h.dashSpeed;
    const g = h.grabbed;
    if (g) {                                               // drag the clamped enemy along in our jaws
      if (g.alive) { g.pos.set(h.pos.x + h.dashDir.x * 1.1, h.pos.y, h.pos.z + h.dashDir.z * 1.1); g.vel.set(0, 0, 0); if (g.kind === 'hero') g.stunT = Math.max(g.stunT, 0.15); }
      if (h.dashT <= 0) {
        if (g.alive) { stun(g, h.grabStun); knock(g, h.dashDir, 5, 4); burst(G, chestOf(g), 0x9cc46a, 1.4); G.ev.flash?.(g, 'Death rolled'); }
        h.grabbed = null;
      }
    }
    for (const u of [...enemiesOf(G, h), ...G.minions.filter(m => m.alive && m.team !== h.team)]) {
      if (h.dashT <= 0 || h.grabbed || h.dashHit.has(u) || u.pos.distanceTo(h.pos) > 1.6) continue;
      h.dashHit.add(u);
      if (h.dashMode === 'grab') {
        damage(G, u, h.dashDmg, h);
        if (u.kind === 'hero') { h.grabbed = u; h.dashT = Math.max(h.dashT, 0.35); }
      } else if (h.dashMode === 'joust') {
        const run = h.dashStart ? Math.hypot(h.pos.x - h.dashStart.x, h.pos.z - h.dashStart.z) : 0;
        damage(G, u, h.dashDmg + run * h.dashPerM, h); knock(u, h.dashDir, 4, h.dashLift);
        if (u.kind === 'hero') { stun(u, 0.4); G.ev.flash?.(u, run > 12 ? 'Unhorsed!' : 'Jousted'); h.dashT = 0; h.vel.x *= 0.2; h.vel.z *= 0.2; }
      } else {
        damage(G, u, h.dashDmg, h); knock(u, h.dashDir, h.dashKnock, 6);
      }
      burst(G, chestOf(u), h.dashColor || 0xffffff, 1.2);
    }
    if (h.dashSpin && h.grabbed) h.dashSpinA = (h.dashSpinA || 0) + dt * 22;
  } else h.dashSpinA = 0;
}

// Snapjaw surfacing from Lurk: launch everyone around him
function lurkBurst(G, h) {
  h.lurkT = 0;
  if (!h.alive) return;
  const a = h.def.ability;
  ring(G, h.pos, 0x7a5a2a, a.radius); burst(G, h.pos.clone().setY(0.6), 0x7a5a2a, a.radius * 0.7); burst(G, h.pos.clone().setY(1.2), 0x6fb5c4, 1.4);
  for (const u of [...enemiesOf(G, h), ...G.minions.filter(m => m.alive && m.team !== h.team)]) {
    if (Math.hypot(u.pos.x - h.pos.x, u.pos.z - h.pos.z) > a.radius) continue;
    const away = v.subVectors(u.pos, h.pos).setY(0).normalize();
    damage(G, u, a.dmg, h); knock(u, away, 3, a.lift);
  }
  G.ev.shake?.(h, 0.4);
  G.ev.surface?.(h);
}

// After movement: handle the slam landing.
export function afterMove(G, h, dt) {
  if (!h.onGround) h.airT += dt;
  else {
    if (h.slamPending && h.airT > 0.25) slamLand(G, h);
    h.airT = 0;
  }
}

// ---------- zones ----------
const ZONE_LOOK = {
  dome: { color: 0x5fe0c0, dome: true }, sanctum: { color: 0xffe08a }, overgrowth: { color: 0x5fb05a },
  frost: { color: 0xbfeaff }, trap: { color: 0x8a5a3c }, nova: { color: 0xff8a3c }, vortex: { color: 0xff4fa3 },
  banner: { color: 0xffe08a }, goo: { color: 0x7ee85a }, stage: { color: 0xff8fc0 }, pylon: { color: 0xffe14a }, fort: { color: 0xff8a2a }, pen: { color: 0x8a5a3a }, heat: { color: 0xffb35a },
};
function zoneMesh(G, kind, pos, radius) {
  const look = ZONE_LOOK[kind];
  const g = new THREE.Group(); g.position.copy(pos);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(radius, 40), new THREE.MeshBasicMaterial({ color: look.color, transparent: true, opacity: 0.25, depthWrite: false }));
  disc.rotation.x = -Math.PI / 2; disc.position.y = 0.06; g.add(disc);
  const rim = new THREE.Mesh(new THREE.RingGeometry(radius - 0.18, radius, 48), new THREE.MeshBasicMaterial({ color: look.color, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide }));
  rim.rotation.x = -Math.PI / 2; rim.position.y = 0.08; g.add(rim);
  if (look.dome) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(radius, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: look.color, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }));
    g.add(d);
  }
  const bits = [];
  const n = kind === 'trap' || kind === 'banner' || kind === 'fort' || kind === 'pen' ? 0 : Math.round(radius * 3);
  for (let i = 0; i < n; i++) {
    let m;
    if (kind === 'overgrowth') m = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.9, 5), new THREE.MeshStandardMaterial({ color: i % 4 ? 0x4f9a48 : 0xff5f8f }));
    else if (kind === 'frost') m = new THREE.Mesh(new THREE.OctahedronGeometry(0.25, 0), new THREE.MeshStandardMaterial({ color: 0xe8f8ff, emissive: 0x9fdcff, emissiveIntensity: 0.4 }));
    else if (kind === 'vortex') m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.18), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x18e0f0 : 0xff4fa3 }));
    else if (kind === 'goo') m = new THREE.Mesh(new THREE.SphereGeometry(0.12 + Math.random() * 0.12, 10, 8), new THREE.MeshStandardMaterial({ color: 0x8af06a, emissive: 0x4fc03a, emissiveIntensity: 0.35, roughness: 0.1 }));
    else m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 4), new THREE.MeshBasicMaterial({ color: look.color }));
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * radius * 0.92;
    m.position.set(Math.cos(a) * r, 0.2, Math.sin(a) * r); m.userData.p = Math.random() * 6;
    g.add(m); bits.push(m);
  }
  if (kind === 'trap') {                                   // a little jaw of thorns
    for (let i = 0; i < 8; i++) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.35, 4), new THREE.MeshStandardMaterial({ color: 0x6b4a33 }));
      const a = i / 8 * Math.PI * 2; c.position.set(Math.cos(a) * 0.6, 0.15, Math.sin(a) * 0.6); c.rotation.z = Math.cos(a) * 0.5; c.rotation.x = -Math.sin(a) * 0.5;
      g.add(c);
    }
    // position is read-only on three.js objects, so set it rather than replace it
    const seed = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), new THREE.MeshStandardMaterial({ color: 0x7fc06a, emissive: 0x5fb05a, emissiveIntensity: 0.3 }));
    seed.position.set(0, 0.12, 0); g.add(seed);
  }
  if (kind === 'banner') {                                 // Cavalier's rally banner on a pole
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 3.2, 6), new THREE.MeshStandardMaterial({ color: 0x6b4a33 }));
    pole.position.y = 1.6; g.add(pole);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), new THREE.MeshStandardMaterial({ color: 0xc23b3b, side: THREE.DoubleSide }));
    flag.position.set(0.62, 2.7, 0); g.add(flag);
    const crest = new THREE.Mesh(new THREE.CircleGeometry(0.22, 12), new THREE.MeshBasicMaterial({ color: 0xffe08a, side: THREE.DoubleSide }));
    crest.position.set(0.62, 2.7, 0.01); g.add(crest);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.3, 6), new THREE.MeshStandardMaterial({ color: 0xffe08a }));
    tip.position.y = 3.35; g.add(tip);
  }
  if (kind === 'pen') {                                    // Crook's sheep pen: a ring of fence posts and rails
    const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 0.85 }), n = Math.round(radius * 3);
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.1, 0.14), wood);
      post.position.set(Math.cos(a) * radius, 0.55, Math.sin(a) * radius); g.add(post);
      const a2 = (i + 1) / n * Math.PI * 2, len = 2 * radius * Math.sin(Math.PI / n);
      for (const y of [0.45, 0.85]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.08, 0.06), wood); rail.position.set((Math.cos(a) + Math.cos(a2)) / 2 * radius, y, (Math.sin(a) + Math.sin(a2)) / 2 * radius); rail.rotation.y = -(a + a2) / 2 + Math.PI / 2; g.add(rail); }
    }
  }
  if (kind === 'pylon') {                                  // Dynamo's pylon: a post with a crackling battery on top
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 1.6, 8), new THREE.MeshStandardMaterial({ color: 0x2b2d4f, roughness: 0.5 }));
    post.position.y = 0.8; g.add(post);
    for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.TorusGeometry(0.22 - i * 0.03, 0.03, 6, 16), new THREE.MeshBasicMaterial({ color: 0xffe14a })); c.rotation.x = Math.PI / 2; c.position.y = 0.6 + i * 0.35; g.add(c); }
    const cell = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), new THREE.MeshStandardMaterial({ color: 0xffe14a, emissive: 0xffe14a, emissiveIntensity: 1.2 }));
    cell.position.y = 1.8; g.add(cell);
  }
  G.scene.add(g);
  return { g, bits, disc };
}
export function addZone(G, z) {
  const m = zoneMesh(G, z.kind, z.pos, z.radius);
  G.zones.push({ max: z.life, ...z, ...m });
}

// ---------- healing slime blobs (Gloop) ----------
// Scattered where Gloop goes down (or by Slime Time). Teammates walk over one to heal.
const BLOB_MAT = new THREE.MeshStandardMaterial({ color: 0x8af06a, emissive: 0x4fc03a, emissiveIntensity: 0.55, roughness: 0.08, metalness: 0.1 });
const BLOB_GEO = new THREE.SphereGeometry(0.32, 16, 12);
// Beef Wellington's Yorkshire puddings: golden cups that heal like Gloop's blobs
const PUD_GEO = new THREE.CylinderGeometry(0.34, 0.22, 0.26, 14), PUD_MAT = new THREE.MeshStandardMaterial({ color: 0xe0a548, emissive: 0xb8742a, emissiveIntensity: 0.35, roughness: 0.6 });
export function dropBlobs(G, h, a, at = h.pos) {
  G.pickups ||= [];
  for (let i = 0; i < a.blobs; i++) {
    const ang = i / a.blobs * Math.PI * 2 + Math.random() * 0.6, r = 1.4 + Math.random() * 1.2;
    const p = new THREE.Vector3(at.x + Math.cos(ang) * r, 0, at.z + Math.sin(ang) * r);
    resolveXZ(p, 0.4, G.colliders); p.y = groundAt(p, 0.3, G.colliders);
    const mesh = new THREE.Mesh(a.geo || BLOB_GEO, a.mat || BLOB_MAT); mesh.position.copy(at).setY(at.y + 1); mesh.castShadow = true; G.scene.add(mesh);
    G.pickups.push({ team: h.team, owner: h, pos: p, from: at.clone().setY(at.y + 1), t: 0, life: a.life || 14, heal: a.heal, mesh, ph: Math.random() * 6 });
  }
  burst(G, at.clone().setY(at.y + 0.8), a.color ?? 0x8af06a, 1.6);
}
function tickPickups(G, dt) {
  const list = G.pickups; if (!list) return;
  for (let i = list.length - 1; i >= 0; i--) {
    const b = list[i];
    b.t += dt; b.life -= dt;
    const fly = Math.min(1, b.t / 0.5);                          // a little hop out of the body
    b.mesh.position.lerpVectors(b.from, b.pos, fly).y += Math.sin(fly * Math.PI) * 1.2 + 0.3 + Math.sin(G.time * 3 + b.ph) * 0.08 * fly;
    const wob = 1 + Math.sin(G.time * 6 + b.ph) * 0.08;
    b.mesh.scale.set(wob, 2 - wob, wob).multiplyScalar(b.life < 3 ? Math.max(0.2, b.life / 3) : 1);
    let taker = null;
    if (fly >= 1) taker = G.heroes.find(u => u.alive && u.team === b.team && u.hp < u.maxHp && Math.hypot(u.pos.x - b.pos.x, u.pos.z - b.pos.z) < 1.2 && Math.abs(u.pos.y - b.pos.y) < 1.5);
    if (taker) {
      const before = taker.hp; taker.hp = Math.min(taker.maxHp, taker.hp + b.heal); setBar(taker);
      G.ev.heal?.(taker, taker.hp - before, b.owner); G.ev.pickup?.(taker, b);
      burst(G, b.mesh.position.clone(), 0x8af06a, 0.9); ring(G, b.pos, 0x8af06a, 1.2);
    }
    if (taker || b.life <= 0) { G.scene.remove(b.mesh); list.splice(i, 1); }
  }
}

export function updateAbilities(G, dt) {
  tickPickups(G, dt); tickHoles(G, dt); tickBlocks(G, dt); tickSheep(G, dt);
  for (const h of G.heroes) { h.zoneSlow = 1; h.zoneMult = 1; }
  for (let i = G.zones.length - 1; i >= 0; i--) {
    const z = G.zones[i];
    z.life -= dt;
    const k = Math.min(1, (z.max - z.life) * 4) * Math.min(1, z.life * 2);
    z.g.scale.setScalar(0.3 + 0.7 * Math.min(1, (z.max - z.life) * 4));
    z.bits.forEach(b => { b.position.y = 0.2 + Math.abs(Math.sin(G.time * 2 + b.userData.p)) * (z.kind === 'sanctum' ? 2 : 0.25); b.rotation.y += dt; });
    z.disc.material.opacity = 0.25 * k;
    if (z.kind === 'vortex') z.g.rotation.y += dt * 3.5;
    if (z.follow) { if (z.follow.alive) { z.pos.copy(z.follow.pos); z.g.position.copy(z.pos); } else z.life = 0; }    // Reheat rides along with the Microwave
    const inside = u => u.alive && Math.hypot(u.pos.x - z.pos.x, u.pos.z - z.pos.z) < z.radius;
    if (z.kind === 'trap') {
      const victim = [...G.heroes, ...G.minions].find(u => u.team !== z.team && !u.deploy && inside(u) && Math.hypot(u.pos.x - z.pos.x, u.pos.z - z.pos.z) < 1.3);
      if (victim) {
        root(victim, z.rootT); damage(G, victim, z.dmg, z.owner);
        burst(G, victim.pos.clone().setY(victim.pos.y + 0.4), 0x5fb05a, 1.4); z.life = 0;
        G.ev.flash?.(victim, 'Rooted');
      }
    }
    for (const u of [...G.heroes, ...G.minions]) {
      if (!inside(u) || u.deploy) continue;
      const ally = u.team === z.team;
      if (ally && z.hps && u.hp < u.maxHp) { u.hp = Math.min(u.maxHp, u.hp + z.hps * dt); setBar(u); }
      if (ally && z.mult && u.kind === 'hero') u.zoneMult = Math.min(u.zoneMult, z.mult);
      if (ally && z.rally && u.kind === 'hero') { u.rallyT = 0.25; u.rallyAmp = z.rally; }
      if (ally && z.haste && u.kind === 'hero') haste(u, 0.25, z.haste);
      if (ally && z.boost && u.kind === 'hero') mend(G, z.owner, u, 0, z.boost * dt);
      if (!ally && z.dps) damage(G, u, z.dps * dt, z.owner);
      if (!ally && z.slow && u.kind === 'hero') u.zoneSlow = Math.min(u.zoneSlow, z.slow);
      if (!ally && z.pull) {                                    // mosh pit: drag toward the middle
        const dx = z.pos.x - u.pos.x, dz = z.pos.z - u.pos.z, d = Math.hypot(dx, dz);
        if (d > 0.7) { u.pos.x += dx / d * z.pull * dt; u.pos.z += dz / d * z.pull * dt; resolveXZ(u.pos, u.radius, G.colliders); }
      }
    }
    if (z.life <= 0) { G.scene.remove(z.g); G.zones.splice(i, 1); }
  }
  for (let i = G.walls.length - 1; i >= 0; i--) {
    const w = G.walls[i]; w.life -= dt;
    const grow = Math.min(1, (w.max - w.life) * 5), fade = Math.min(1, w.life * 2);
    w.mesh.scale.y = Math.max(0.01, grow * fade);
    if (w.life <= 0) { w.collider.alive = false; G.scene.remove(w.mesh); G.walls.splice(i, 1); }
  }
  for (let i = G.timers.length - 1; i >= 0; i--) {
    const t = G.timers[i]; t.t -= dt;
    if (t.t <= 0) { G.timers.splice(i, 1); t.fn(); }
  }
}

// ---------- deployables (live in G.minions with their own update) ----------
function makeTurret(G, h, a, pos) {
  const mesh = new THREE.Group();
  const leg = new THREE.MeshStandardMaterial({ color: 0x3a3f4a });
  for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.8, 5), leg); const ang = i / 3 * Math.PI * 2; l.position.set(Math.cos(ang) * 0.25, 0.35, Math.sin(ang) * 0.25); l.rotation.set(Math.sin(ang) * 0.4, 0, -Math.cos(ang) * 0.4); mesh.add(l); }
  const head = new THREE.Group(); head.position.y = 0.85; mesh.add(head);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), new THREE.MeshStandardMaterial({ color: 0x8fa3bf })));
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshStandardMaterial({ color: 0x7af0ff, emissive: 0x7af0ff, emissiveIntensity: 0.9 })); eye.position.z = -0.27; head.add(eye);
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.5), new THREE.MeshStandardMaterial({ color: 0x1d2340 })); barrel.position.set(0.18, -0.05, -0.3); head.add(barrel);
  for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 4), new THREE.MeshStandardMaterial({ color: 0xff7a2a })); ear.position.set(s * 0.18, 0.28, 0); head.add(ear); }
  const flag = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.5, 20), new THREE.MeshBasicMaterial({ color: TEAM_COLOR[h.team], side: THREE.DoubleSide }));
  flag.rotation.x = -Math.PI / 2; flag.position.y = 0.04; mesh.add(flag);
  mesh.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return {
    mesh, head, turret: true, hitY: 0.8, hitR: 0.45, hp: a.hp, maxHp: a.hp, life: a.life, atkT: 0.5, bob: 0, megaT: 0,
    update(G, m, dt) {
      m.life -= dt; m.atkT -= dt; m.bob += dt;
      if (m.megaT > 0) m.megaT -= dt;
      const big = m.megaT > 0 ? 1.7 : 1;
      m.mesh.position.copy(m.pos); m.mesh.scale.setScalar(Math.min(1, m.bob * 4) * big);
      if (m.life <= 0) { m.alive = false; burst(G, m.pos.clone().setY(0.8), 0x8fa3bf, 1.2); G.scene.remove(m.mesh); return; }
      const top = m.pos.clone().setY(0.85);
      let best = null, bd = a.range;
      for (const e of [...G.heroes, ...G.minions]) {
        if (!e.alive || e.team === m.team || (e.kind === 'hero' && isHidden(e))) continue;
        const d = e.pos.distanceTo(m.pos);
        if (d < bd && hasLOS(top, chestOf(e), G.colliders)) { bd = d; best = e; }
      }
      if (!best) { m.head.rotation.y += dt * 0.8; return; }
      // a fresh target takes a moment to lock on to, so a turret can't instantly snap between people
      if (best !== m.lockOn) { m.lockOn = best; m.atkT = Math.max(m.atkT, (a.lock || 0) * (m.megaT > 0 ? 0.5 : 1)); }
      const c = chestOf(best);
      m.head.rotation.y = Math.atan2(-(c.x - m.pos.x), -(c.z - m.pos.z));
      if (m.atkT <= 0) {
        const mega = m.megaT > 0;
        m.atkT = a.rate / (mega ? m.megaRate : 1);
        tracer(G, top, c, mega ? 0xff7a2a : 0x7af0ff, 0.06, mega ? 3 : 1);
        damage(G, best, a.dmg * (mega ? m.megaDmg : 1), m.owner);
        G.ev.turretShot?.(m);
      }
    },
  };
}

function makeDecoy(G, h, a, pos) {
  const model = buildHeroModel(h.def, TEAM_COLOR[h.team]);
  model.root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  const dir = dirFrom(h.yaw, 0);
  return {
    mesh: model.root, hitY: 1.0, hitR: 0.6, hp: a.hp, maxHp: a.hp, life: a.life, decoy: true, def: h.def, bob: 0,
    update(G, m, dt) {
      m.life -= dt; m.bob += dt;
      if (m.life <= 0) { m.alive = false; confetti(G, m.pos); G.scene.remove(m.mesh); return; }
      m.vel.x = dir.x * h.def.speed * 0.8; m.vel.z = dir.z * h.def.speed * 0.8;
      m.vel.y -= 24 * dt; m.pos.addScaledVector(m.vel, dt);
      resolveXZ(m.pos, 0.45, G.colliders);
      const g = groundAt(m.pos, 0.45, G.colliders); if (m.pos.y <= g) { m.pos.y = g; m.vel.y = 0; }
      m.mesh.position.copy(m.pos); m.mesh.rotation.y = h.yaw;
      model.anim(dt, h.def.speed * 0.8, G.time);
      if (Math.random() < dt * 0.6 && m.pos.y <= g + 0.01) m.vel.y = 7;
    },
  };
}

function deploy(G, h, part, pos) {
  const m = {
    kind: 'minion', deploy: true, team: h.team, owner: h, alive: true, pos: pos.clone(), vel: new THREE.Vector3(), radius: 0.45,
    atkT: 0, bob: 0, stunT: 0, ...part,
  };
  m.bar = makeBar(0.9, (part.hitY || 0.5) + 1.05); m.mesh.add(m.bar); setBar(m, TEAM_COLOR[h.team]);
  m.mesh.position.copy(pos); G.scene.add(m.mesh);
  G.minions.push(m);
  return m;
}

function confetti(G, p) {
  for (let i = 0; i < 18; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.2), new THREE.MeshBasicMaterial({ color: [0xd94fa0, 0xf2c94c, 0xffffff, 0x5bc0eb][i % 4], side: THREE.DoubleSide, transparent: true }));
    m.position.set(p.x, p.y + 1.2, p.z);
    G.scene.add(m);
    G.fx.push({ obj: m, life: 1.4, max: 1.4, kind: 'debris', vel: new THREE.Vector3((Math.random() - 0.5) * 6, 4 + Math.random() * 4, (Math.random() - 0.5) * 6), spin: Math.random() * 10 });
  }
}

// ---------- helpers ----------
function aimPoint(G, h, ctx, range) {
  if (ctx.target) return ctx.target.pos.clone();
  const o = eyeOf(h), d = ctx.aim || dirFrom(h.yaw, h.pitch);
  const r = trace(G, o, d, range, h.team);
  const p = r.point; p.y = groundAt(p, 0.1, G.colliders);
  return p;
}
function thrown(G, h, ctx, w) {
  const d = (ctx.aim || dirFrom(h.yaw, h.pitch)).clone();
  d.y += w.lift ?? 0.18; d.normalize();
  const from = eyeOf(h).addScaledVector(d, 0.8);
  spawnProjectile(G, h, from, d.multiplyScalar(w.speed), w);
}
function slamLand(G, h) {
  const a = h.def.ult;
  h.slamPending = false; h.knockT = 0;
  ring(G, h.pos, 0xbfeaff, a.radius); ring(G, h.pos, 0xffffff, a.radius * 0.6);
  burst(G, h.pos.clone().setY(0.5), 0xffffff, a.radius * 0.7);
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.25 + Math.random() * 0.25, 0), new THREE.MeshStandardMaterial({ color: 0xe8f8ff, transparent: true }));
    m.position.set(h.pos.x, 0.4, h.pos.z); G.scene.add(m);
    const ang = Math.random() * Math.PI * 2;
    G.fx.push({ obj: m, life: 1, max: 1, kind: 'debris', vel: new THREE.Vector3(Math.cos(ang) * 8, 6 + Math.random() * 5, Math.sin(ang) * 8), spin: 6 });
  }
  for (const u of [...enemiesOf(G, h), ...G.minions.filter(m => m.alive && m.team !== h.team)]) {
    const d = u.pos.distanceTo(h.pos);
    if (d > a.radius) continue;
    damage(G, u, a.dmg * (1 - 0.4 * d / a.radius), h);
    knock(u, flat(v.subVectors(u.pos, h.pos).setY(0.001)), a.knock * (1 - d / a.radius * 0.5), 7);
  }
  G.ev.shake?.(h, 1);
}

// ---------- the abilities ----------
export const ABIL = {
  barrier: {
    cast(G, h, a) { h.barrierT = a.dur; h.barrierM = a.mult; return true; },
    ai: (G, b, a, c) => c.heroT && b.hp < b.maxHp * 0.65,
  },
  blink: {
    cast(G, h, a, ctx) {
      const d = ctx.wish && ctx.wish.lengthSq() > 0.01 ? ctx.wish.clone().normalize() : dirFrom(h.yaw, 0);
      const from = h.pos.clone();
      for (let s = 0; s < 30; s++) { h.pos.addScaledVector(d, a.dist / 30); resolveXZ(h.pos, h.radius, G.colliders); }
      for (let i = 0; i < 4; i++) tracer(G, from.clone().setY(from.y + 0.5 + i * 0.4), h.pos.clone().setY(h.pos.y + 0.5 + i * 0.4), i % 2 ? 0xffc93c : 0xff4fa3, 0.35);
      if (h.rushT > 0) {                                    // Rush Hour: leave a parcel bomb where you were
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.35, 0.45), new THREE.MeshStandardMaterial({ color: 0xc99a62 }));
        box.position.copy(from).setY(from.y + 0.2); G.scene.add(box);
        G.timers.push({ t: 0.7, fn: () => {
          G.scene.remove(box); ring(G, from, 0xffc93c, 3.5); burst(G, from.clone().setY(0.8), 0xffc93c, 1.6);
          for (const u of [...enemiesOf(G, h), ...G.minions.filter(m => m.alive && m.team !== h.team)]) if (u.pos.distanceTo(from) < 3.5) damage(G, u, 40, h);
          G.ev.boom?.(from);
        } });
      }
      return true;
    },
    ai: (G, b, a, c) => (c.heroT && c.dist > b.def.prefRange + 6) || (b.ai.retreat && b.lastHurtT > G.time - 1),
  },
  nova: {
    cast(G, h, a) {
      ring(G, h.pos, 0xff8a3c, a.radius); ring(G, h.pos, 0xffd23c, a.radius * 0.7);
      burst(G, h.pos.clone().setY(1), 0xffb05a, a.radius * 0.6);
      for (const u of [...enemiesOf(G, h), ...G.minions.filter(m => m.alive && m.team !== h.team)]) if (u.pos.distanceTo(h.pos) < a.radius) damage(G, u, a.dmg, h);
      return true;
    },
    ai: (G, b, a, c) => c.near(a.radius - 1) >= 1,
  },
  heal: {
    cast(G, h, a) {
      ring(G, h.pos, 0x3ccf9a, a.radius);
      for (const u of alliesOf(G, h)) if (u.pos.distanceTo(h.pos) < a.radius) { const before = u.hp; u.hp = Math.min(u.maxHp, u.hp + a.amount); setBar(u); G.ev.heal?.(u, u.hp - before, h); }
      return true;
    },
    ai: (G, b, a) => b.hp < b.maxHp * 0.6 || alliesOf(G, b).some(u => u !== b && u.hp < u.maxHp * 0.5 && u.pos.distanceTo(b.pos) < a.radius),
  },
  hook: {
    cast(G, h, a, ctx) {
      const o = eyeOf(h), d = ctx.aim || dirFrom(h.yaw, h.pitch);
      const r = trace(G, o, d, a.range, h.team);
      for (let i = 0; i < 3; i++) tracer(G, o.clone().setY(o.y - 0.3 + i * 0.05), r.point, i ? 0x8a8f99 : 0xd9a441, 0.35);
      burst(G, r.point, 0xd9a441, 0.6);
      const u = r.unit;
      if (u && (u.kind === 'hero' || (u.kind === 'minion' && !u.deploy))) {
        damage(G, u, a.dmg, h);
        const back = flat(v.subVectors(h.pos, u.pos));
        const dist = u.pos.distanceTo(h.pos);
        knock(u, back, Math.min(a.pull, dist * 1.6), 5);
        if (u.kind === 'hero') u.knockT = 0.5;
      }
      return true;
    },
    ai: (G, b, a, c) => c.heroT && c.dist > 7 && c.dist < a.range - 2,
  },
  dome: {
    cast(G, h, a) { addZone(G, { kind: 'dome', pos: h.pos.clone().setY(0), radius: a.radius, life: a.dur, team: h.team, owner: h, mult: a.mult }); return true; },
    ai: (G, b, a, c) => c.heroT && (b.hp < b.maxHp * 0.6 || c.alliesNear(a.radius) >= 1),
  },
  parcel: {
    cast(G, h, a, ctx) { thrown(G, h, ctx, { dmg: a.dmg, splash: a.splash, speed: a.speed, grav: 16, color: 0xc99a62, size: 0.3, box: true, lift: 0.22 }); return true; },
    ai: (G, b, a, c) => c.tgt && c.dist > 5 && c.dist < 22,
  },
  rush: {
    cast(G, h, a) { h.hasteT = a.dur; h.hasteSpeed = a.speed; h.hasteFire = a.fire; h.noReloadT = a.dur; h.reloadT = 0; h.ammo = h.def.weapon.mag; h.cd.ability = 0; h.rushT = a.dur; return true; },
    ai: (G, b, a, c) => c.heroT && c.dist < 18,
  },
  candle: {
    cast(G, h, a, ctx) {
      const base = ctx.aim || dirFrom(h.yaw, h.pitch);
      for (let i = 0; i < a.count; i++) {
        const yaw = (i - (a.count - 1) / 2) * 0.09;
        const d = base.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw); d.y += 0.04 + Math.random() * 0.03;
        G.timers.push({ t: i * 0.07, fn: () => h.alive && spawnProjectile(G, h, eyeOf(h).addScaledVector(d, 0.8), d.clone().normalize().multiplyScalar(40), { dmg: a.dmg, splash: a.splash, grav: 2, color: [0xff4fa3, 0xffd23c, 0x7af0ff, 0xff8a3c, 0xb98cff][i % 5], size: 0.14, trail: true }) });
      }
      return true;
    },
    ai: (G, b, a, c) => c.tgt && c.dist < 22,
  },
  barrage: {
    cast(G, h, a, ctx) {
      const p = aimPoint(G, h, ctx, 60);
      ring(G, p, 0xff8a3c, a.radius);
      for (let i = 0; i < a.shells; i++) {
        G.timers.push({ t: 0.4 + i * 0.16, fn: () => {
          const ang = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * a.radius;
          const at = new THREE.Vector3(p.x + Math.cos(ang) * r, 28, p.z + Math.sin(ang) * r);
          spawnProjectile(G, h, at, new THREE.Vector3(0, -38, 0), { dmg: a.dmg, splash: a.splash, grav: 0, color: [0xff4fa3, 0xffd23c, 0x7af0ff, 0xff8a3c][i % 4], size: 0.3, trail: true, big: true });
        } });
      }
      return true;
    },
    ai: (G, b, a, c) => c.tgt && c.dist < 45 && (c.heroT || c.tgt.kind === 'tower' || c.tgt.kind === 'core'),
  },
  mark: {
    cast(G, h, a, ctx) {
      const o = eyeOf(h), d = ctx.aim || dirFrom(h.yaw, h.pitch);
      const r = trace(G, o, d, a.range, h.team);
      tracer(G, o.clone().setY(o.y - 0.2), r.point, 0xffe08a, 0.4);
      burst(G, r.point, 0xffe08a, 0.8);
      if (r.unit && r.unit.kind === 'hero') { r.unit.markT = a.dur; r.unit.markAmp = a.amp; breakInvis(r.unit); G.ev.flash?.(r.unit, 'Marked'); }
      return true;
    },
    ai: (G, b, a, c) => c.heroT && c.dist < a.range,
  },
  sanctum: {
    cast(G, h, a) { addZone(G, { kind: 'sanctum', pos: h.pos.clone().setY(0), radius: a.radius, life: a.dur, team: h.team, owner: h, hps: a.hps }); return true; },
    ai: (G, b, a, c) => (b.hp < b.maxHp * 0.5 && c.heroT) || alliesOf(G, b).filter(u => u.pos.distanceTo(b.pos) < a.radius && u.hp < u.maxHp * 0.7).length >= 2,
  },
  wall: {
    cast(G, h, a) {
      const f = dirFrom(h.yaw, 0), c = h.pos.clone().addScaledVector(f, 3);
      const alongX = Math.abs(f.z) > Math.abs(f.x);
      const w = alongX ? a.width : 1, d = alongX ? 1 : a.width;
      const collider = makeBox(c.x, c.z, w, d, a.height);
      G.colliders.push(collider);
      const mesh = new THREE.Group(); mesh.position.set(c.x, 0, c.z);
      const core = new THREE.Mesh(new THREE.BoxGeometry(w, a.height, d), new THREE.MeshStandardMaterial({ color: 0x4f7a3a }));
      core.position.y = a.height / 2; core.castShadow = true; mesh.add(core);
      for (let i = 0; i < 26; i++) {
        const t = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.5, 4), new THREE.MeshStandardMaterial({ color: i % 5 ? 0x6b4a33 : 0xff5f8f }));
        t.position.set((Math.random() - 0.5) * w, Math.random() * a.height, (Math.random() - 0.5) * d);
        t.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3); mesh.add(t);
      }
      for (let i = 0; i < 8; i++) {
        const l = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 0), new THREE.MeshStandardMaterial({ color: 0x5fb05a, flatShading: true }));
        l.position.set((Math.random() - 0.5) * w, a.height - 0.1, (Math.random() - 0.5) * d); mesh.add(l);
      }
      G.scene.add(mesh);
      G.walls.push({ collider, mesh, life: a.dur, max: a.dur });
      return true;
    },
    ai: (G, b, a, c) => c.heroT && (b.hp < b.maxHp * 0.5 || b.ai.retreat) && c.dist > 5,
  },
  snare: {
    cast(G, h, a, ctx) {
      thrown(G, h, ctx, { dmg: 0, splash: 0, speed: 22, grav: 18, color: 0x7fc06a, size: 0.2, lift: 0.25, noDirect: true,
        onExplode: (G2, p) => { const at = p.clone(); at.y = groundAt(at, 0.1, G.colliders); addZone(G, { kind: 'trap', pos: at, radius: 1.4, life: a.life, team: h.team, owner: h, rootT: a.root, dmg: a.dmg }); } });
      return true;
    },
    ai: (G, b, a, c) => c.heroT && c.dist < 16,
  },
  overgrowth: {
    cast(G, h, a, ctx) { addZone(G, { kind: 'overgrowth', pos: aimPoint(G, h, ctx, 22), radius: a.radius, life: a.dur, team: h.team, owner: h, dps: a.dps, slow: a.slow, hps: a.hps }); return true; },
    ai: (G, b, a, c) => c.heroT && c.dist < 20,
  },
  turret: {
    cast(G, h, a) {
      const p = h.pos.clone().addScaledVector(dirFrom(h.yaw, 0), 1.6); resolveXZ(p, 0.5, G.colliders); p.y = groundAt(p, 0.3, G.colliders);
      deploy(G, h, makeTurret(G, h, a, p), p);
      return true;
    },
    ai: (G, b, a, c) => !!c.tgt && c.dist < a.range,
  },
  coil: {
    cast(G, h, a, ctx) {
      thrown(G, h, ctx, { dmg: a.dmg, splash: a.splash, speed: 24, grav: 14, color: 0x7af0ff, size: 0.22, lift: 0.2,
        onExplode: (G2, p) => {
          ring(G, p, 0x7af0ff, a.splash);
          for (let i = 0; i < 6; i++) { const ang = i / 6 * Math.PI * 2; tracer(G, p, p.clone().add(new THREE.Vector3(Math.cos(ang) * a.splash, 0.6 + Math.random(), Math.sin(ang) * a.splash)), 0x7af0ff, 0.3); }
          for (const u of [...G.heroes, ...G.minions]) if (u.alive && u.team !== h.team && chestOf(u).distanceTo(p) < a.splash) stun(u, a.stun);
        } });
      return true;
    },
    ai: (G, b, a, c) => c.heroT && c.dist > 4 && c.dist < 20,
  },
  overclock: {
    // Mega Biscuit: every Biscuit you own (or a fresh one) grows into a heavy turret
    cast(G, h, a) {
      let mine = G.minions.filter(m => m.alive && m.turret && m.owner === h);
      if (!mine.length) {
        const p = h.pos.clone().addScaledVector(dirFrom(h.yaw, 0), 1.6); resolveXZ(p, 0.5, G.colliders); p.y = groundAt(p, 0.3, G.colliders);
        mine = [deploy(G, h, makeTurret(G, h, h.def.ability, p), p)];
      }
      for (const m of mine) {
        m.megaT = a.dur; m.megaRate = a.rate; m.megaDmg = a.dmg;
        m.life = Math.max(m.life, a.dur); m.maxHp = a.hp; m.hp = a.hp; setBar(m, TEAM_COLOR[m.team]);
        ring(G, m.pos, 0xff7a2a, 3); burst(G, m.pos.clone().setY(1), 0xff7a2a, 1.6);
      }
      return true;
    },
    ai: (G, b, a, c) => c.heroT && c.dist < 24,
  },
  vanish: {
    cast(G, h, a) { h.invisT = a.dur; h.ambush = a.bonus; confetti(G, h.pos); return true; },
    ai: (G, b, a, c) => c.heroT && (b.hp < b.maxHp * 0.5 || c.dist > b.def.prefRange + 6),
  },
  decoy: {
    cast(G, h, a) {
      const p = h.pos.clone().addScaledVector(dirFrom(h.yaw, 0), 1.2);
      deploy(G, h, makeDecoy(G, h, a, p), p);
      confetti(G, p);
      return true;
    },
    ai: (G, b, a, c) => c.heroT && c.dist < 30,
  },
  showstop: {
    cast(G, h, a, ctx) {
      const f = flat(ctx.aim || dirFrom(h.yaw, 0)), o = eyeOf(h);
      for (let i = 0; i < 14; i++) {
        const d = f.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), (i / 13 - 0.5) * 1.8);
        tracer(G, o, o.clone().addScaledVector(d, a.range).setY(o.y - 0.6 + Math.random() * 0.8), i % 2 ? 0xd94fa0 : 0xf2c94c, 0.4);
      }
      for (const u of [...G.heroes, ...G.minions]) {
        if (!u.alive || u.team === h.team) continue;
        const to = v.subVectors(u.pos, h.pos); const d = to.length(); to.y = 0; to.normalize();
        if (d < a.range && to.dot(f) > a.cone) { stun(u, a.stun); damage(G, u, a.dmg, h); burst(G, chestOf(u), 0xf2c94c, 0.8); }
      }
      return true;
    },
    ai: (G, b, a, c) => {
      const f = dirFrom(b.yaw, 0);
      return enemiesOf(G, b).filter(e => { const to = v.subVectors(e.pos, b.pos); const d = to.length(); to.y = 0; to.normalize(); return d < a.range && to.dot(f) > a.cone; }).length >= 1;
    },
  },
  frost: {
    cast(G, h, a, ctx) { addZone(G, { kind: 'frost', pos: aimPoint(G, h, ctx, 26), radius: a.radius, life: a.dur, team: h.team, owner: h, dps: a.dps, slow: a.slow }); return true; },
    ai: (G, b, a, c) => c.heroT && c.dist < 22,
  },
  charge: {
    cast(G, h, a) {
      h.dashDir = dirFrom(h.yaw, 0); h.dashT = 0.45; h.dashSpeed = a.dist / 0.45; h.dashDmg = a.dmg; h.dashKnock = a.knock; h.dashHit = new Set();
      h.dashStun = 0; h.dashColor = 0xffffff; h.dashSpin = false; h.dashMode = null; h.grabbed = null;
      return true;
    },
    ai: (G, b, a, c) => c.heroT && c.dist > 3 && c.dist < a.dist,
  },
  slam: {
    cast(G, h, a) {
      if (!h.onGround) return false;
      const f = dirFrom(h.yaw, 0);
      h.vel.set(f.x * 9, 13, f.z * 9); h.onGround = false; h.slamPending = true; h.knockT = 1.6; h.airT = 0;
      return true;
    },
    ai: (G, b, a, c) => c.heroT && c.dist < 9 && b.onGround,
  },

  // ---- Tempo ----
  bassdrop: {
    cast(G, h, a, ctx) {
      const f = flat(ctx.aim || dirFrom(h.yaw, 0)), o = eyeOf(h);
      for (let i = 1; i <= 3; i++) G.timers.push({ t: i * 0.05, fn: () => ring(G, h.pos.clone().addScaledVector(f, i * 2.6), i % 2 ? 0xff4fa3 : 0x18e0f0, 1.4 + i * 0.9) });
      for (let i = 0; i < 9; i++) {
        const d = f.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), (i / 8 - 0.5) * 1.6);
        tracer(G, o.clone().setY(o.y - 0.4), o.clone().addScaledVector(d, a.range).setY(o.y - 0.5 + Math.random() * 0.6), i % 2 ? 0xff4fa3 : 0x18e0f0, 0.3);
      }
      for (const u of [...enemiesOf(G, h), ...G.minions.filter(m => m.alive && m.team !== h.team && !m.deploy)]) {
        const to = v.subVectors(u.pos, h.pos); const d = to.length(); to.y = 0; to.normalize();
        if (d > a.range || to.dot(f) < a.cone) continue;
        damage(G, u, a.dmg, h); knock(u, to.clone(), a.knock * (1 - d / a.range * 0.4), 6);
        burst(G, chestOf(u), 0xff4fa3, 0.7);
      }
      G.ev.shake?.(h, 0.5);
      return true;
    },
    ai: (G, b, a, c) => {
      const f = dirFrom(b.yaw, 0);
      return enemiesOf(G, b).some(e => { const to = v.subVectors(e.pos, b.pos); const d = to.length(); to.y = 0; to.normalize(); return d < a.range * 0.8 && to.dot(f) > a.cone; });
    },
  },
  rewind: {
    cast(G, h, a) {
      const s = h.hist.find(p => p.t >= G.time - a.back - 0.05);
      if (!s || G.time - s.t < 0.5) return false;
      const trail = h.hist.filter(p => p.t >= s.t);
      for (let i = 1; i < trail.length; i++) {
        const p0 = trail[i - 1], p1 = trail[i];
        tracer(G, new THREE.Vector3(p0.x, p0.y + 1, p0.z), new THREE.Vector3(p1.x, p1.y + 1, p1.z), i % 2 ? 0x18e0f0 : 0xff4fa3, 0.6);
      }
      burst(G, chestOf(h), 0x18e0f0, 1.2);
      h.pos.set(s.x, s.y, s.z); h.vel.set(0, 0, 0);
      const before = h.hp; h.hp = Math.max(h.hp, s.hp); setBar(h);
      if (h.hp > before) G.ev.heal?.(h, h.hp - before, h);
      h.hist.length = 0;
      ring(G, h.pos, 0xff4fa3, 2.4); burst(G, chestOf(h), 0xff4fa3, 1.2);
      return true;
    },
    ai: (G, b, a) => b.hp < b.maxHp * 0.45 && b.hist.length > 20 && b.hist[0].hp > b.hp + 35,
  },
  moshpit: {
    cast(G, h, a, ctx) {
      const p = aimPoint(G, h, ctx, 30);
      addZone(G, { kind: 'vortex', pos: p, radius: a.radius, life: a.dur, team: h.team, owner: h, dps: a.dps, pull: a.pull });
      ring(G, p, 0xff4fa3, a.radius); ring(G, p, 0x18e0f0, a.radius * 0.6);
      return true;
    },
    ai: (G, b, a, c) => c.heroT && c.dist < 26,
  },

  // ---- Kestrel ----
  updraft: {
    cast(G, h, a) {
      h.vel.y = a.lift; h.onGround = false; h.glideT = a.glide;
      ring(G, h.pos, 0xffffff, 2.2); burst(G, h.pos.clone().setY(h.pos.y + 0.3), 0xf6ecd9, 1.3);
      for (let i = 0; i < 6; i++) { const ang = i / 6 * Math.PI * 2; tracer(G, h.pos.clone().add(new THREE.Vector3(Math.cos(ang) * 0.8, 0.2, Math.sin(ang) * 0.8)), h.pos.clone().add(new THREE.Vector3(Math.cos(ang) * 0.4, 4, Math.sin(ang) * 0.4)), 0xffffff, 0.4); }
      return true;
    },
    ai: (G, b, a, c) => c.heroT && b.onGround && (b.hp < b.maxHp * 0.5 || c.dist < 9),
  },
  flare: {
    cast(G, h, a, ctx) {
      const p = aimPoint(G, h, ctx, a.range);
      tracer(G, eyeOf(h), p.clone().setY(p.y + 0.5), 0xff5a36, 0.5);
      ring(G, p, 0xff5a36, a.radius); burst(G, p.clone().setY(p.y + 1.5), 0xffd23c, 1.6);
      for (const u of enemiesOf(G, h)) {
        if (Math.hypot(u.pos.x - p.x, u.pos.z - p.z) > a.radius) continue;
        breakInvis(u);                                       // reveal, then jam their gadgets
        u.cd.q += a.jam; u.cd.ability += a.jam; u.ult = Math.max(0, u.ult - a.drain);
        u.jamT = a.jam; G.ev.flash?.(u, 'Jammed');
      }
      return true;
    },
    ai: (G, b, a, c) => c.heroT && c.dist < a.range,
  },
  strafe: {
    cast(G, h, a, ctx) {
      const f = flat(ctx.aim || dirFrom(h.yaw, 0));
      const start = h.pos.clone().addScaledVector(f, 4).setY(0);
      // the biplane: a fuselage mesh with wings and tail as children
      const pal = h.def.palette;
      const plane = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 4), new THREE.MeshStandardMaterial({ color: pal.main, transparent: true }));
      for (const y of [-0.45, 0.75]) { const w = new THREE.Mesh(new THREE.BoxGeometry(7, 0.14, 1.2), new THREE.MeshStandardMaterial({ color: pal.trim })); w.position.set(0, y, -0.4); plane.add(w); }
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.9), new THREE.MeshStandardMaterial({ color: pal.trim })); tail.position.set(0, 0.6, 1.7); plane.add(tail);
      const prop = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.16, 0.06), new THREE.MeshStandardMaterial({ color: 0x1d2340 })); prop.position.z = -2.05; prop.name = 'prop'; plane.add(prop);
      plane.position.copy(start).addScaledVector(f, -30).setY(17);
      plane.rotation.y = Math.atan2(-f.x, -f.z);
      G.scene.add(plane);
      G.fx.push({ obj: plane, life: 2.6, max: 2.6, kind: 'fly', vel: f.clone().multiplyScalar(30) });
      ring(G, start.clone().addScaledVector(f, a.bombs * a.gap * 0.5), 0xffc93c, a.bombs * a.gap * 0.5);
      for (let i = 0; i < a.bombs; i++) {
        const at = start.clone().addScaledVector(f, i * a.gap);
        G.timers.push({ t: 0.9 + i * 0.085, fn: () => spawnProjectile(G, h, new THREE.Vector3(at.x, 16, at.z), new THREE.Vector3(f.x * 6, -34, f.z * 6),
          { dmg: a.dmg, splash: a.splash, grav: 6, color: i % 2 ? 0xffc93c : 0xff5a36, size: 0.3, box: true, trail: true, big: true }) });
      }
      return true;
    },
    ai: (G, b, a, c) => c.heroT && c.dist > 5 && c.dist < 28,
  },

  // ---- Snapjaw ----
  roll: {
    cast(G, h, a) {
      h.dashDir = dirFrom(h.yaw, 0); h.dashT = 0.4; h.dashSpeed = a.dist / 0.4; h.dashDmg = a.dmg; h.dashHit = new Set();
      h.dashMode = 'grab'; h.grabbed = null; h.grabStun = a.stun; h.dashColor = 0x9cc46a; h.dashSpin = true;
      burst(G, h.pos.clone().setY(0.4), 0x7a5a2a, 1.1);
      return true;
    },
    ai: (G, b, a, c) => c.heroT && c.dist > 2 && c.dist < a.dist,
  },
  submerge: {
    cast(G, h, a) {
      ring(G, h.pos, 0x3f7a8a, 2.2); burst(G, h.pos.clone().setY(0.3), 0x6fb5c4, 1.4);
      h.lurkT = a.dur; h.slowT = a.dur; h.slowM = a.speed;
      return true;
    },
    ai: (G, b, a, c) => c.heroT && (b.hp < b.maxHp * 0.45 || c.dist < a.radius + 3),
  },
  jaws: {
    cast(G, h, a, ctx) {
      const p = aimPoint(G, h, ctx, 34);
      ring(G, p, 0x9cc46a, a.radius);
      G.timers.push({ t: 0.55, fn: () => {
        // two rows of teeth burst up and snap together
        for (const s of [-1, 1]) for (let i = 0; i < 9; i++) {
          const m = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.3, 4), new THREE.MeshStandardMaterial({ color: 0xf4efd8, transparent: true }));
          m.position.set(p.x + (i - 4) * a.radius * 0.2, 0.3, p.z + s * a.radius * 0.6);
          G.scene.add(m);
          G.fx.push({ obj: m, life: 0.9, max: 0.9, kind: 'debris', vel: new THREE.Vector3(0, 7, -s * a.radius * 1.2), spin: 0 });
        }
        ring(G, p, 0x5f8f3a, a.radius); burst(G, p.clone().setY(0.8), 0x9cc46a, a.radius * 0.8);
        for (const u of [...G.heroes, ...G.minions]) {
          if (!u.alive || u.team === h.team || Math.hypot(u.pos.x - p.x, u.pos.z - p.z) > a.radius) continue;
          damage(G, u, a.dmg, h); root(u, a.root);
          if (u.kind === 'hero') G.ev.flash?.(u, 'Chomped');
        }
        G.ev.shake?.(h, 0.6);
      } });
      return true;
    },
    ai: (G, b, a, c) => c.heroT && c.dist < 28,
  },

  // ---- Cavalier ----
  lance: {
    cast(G, h, a) {
      h.dashDir = dirFrom(h.yaw, 0); h.dashT = 0.6; h.dashSpeed = a.dist / 0.6; h.dashDmg = a.dmg; h.dashHit = new Set();
      h.dashMode = 'joust'; h.dashPerM = a.perM; h.dashLift = a.lift; h.dashStart = h.pos.clone(); h.grabbed = null;
      h.dashStun = 0; h.dashColor = 0xffe08a; h.dashSpin = false;
      for (let i = 0; i < 3; i++) tracer(G, h.pos.clone().setY(0.4 + i * 0.5), h.pos.clone().addScaledVector(h.dashDir, -3).setY(0.4 + i * 0.5), 0xffe08a, 0.4);
      return true;
    },
    ai: (G, b, a, c) => c.heroT && c.dist > 8 && c.dist < a.dist,
  },
  rally: {
    cast(G, h, a) {
      addZone(G, { kind: 'banner', pos: h.pos.clone().setY(0), radius: a.radius, life: a.dur, team: h.team, owner: h, rally: a.amp });
      ring(G, h.pos, 0xffe08a, a.radius);
      return true;
    },
    ai: (G, b, a, c) => c.heroT && c.dist < 25,
  },
  stampede: {
    cast(G, h, a, ctx) {
      const f = flat(ctx.aim || dirFrom(h.yaw, 0)), side = new THREE.Vector3(-f.z, 0, f.x);
      const start = h.pos.clone().addScaledVector(f, -2).setY(0);
      const time = a.range / a.speed;
      // a herd of glowing horses: bodies with a head, neck and legs as children
      for (let i = 0; i < 7; i++) {
        const off = (i / 6 - 0.5) * a.width, lag = Math.random() * 2;
        const mat = new THREE.MeshBasicMaterial({ color: i % 2 ? 0xbfe6ff : 0xffffff, transparent: true });
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.75, 1.7), mat);
        const neck = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.9, 0.4), mat); neck.position.set(0, 0.6, -0.8); neck.rotation.x = -0.5; body.add(neck);
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.7), mat); head.position.set(0, 1.0, -1.15); body.add(head);
        for (const [x, z] of [[-0.25, -0.6], [0.25, -0.6], [-0.25, 0.6], [0.25, 0.6]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.8, 0.15), mat); l.position.set(x, -0.7, z); body.add(l); }
        body.position.copy(start).addScaledVector(side, off).addScaledVector(f, -lag).setY(1.2);
        body.rotation.y = Math.atan2(-f.x, -f.z);
        G.scene.add(body);
        G.fx.push({ obj: body, life: time + 0.3, max: time + 0.3, kind: 'fly', vel: f.clone().multiplyScalar(a.speed) });
      }
      const hit = new Set(), steps = Math.ceil(time / 0.05);
      for (let s = 1; s <= steps; s++) G.timers.push({ t: s * 0.05, fn: () => {
        const front = (s / steps) * a.range;
        for (const u of [...G.heroes, ...G.minions]) {
          if (!u.alive || u.team === h.team || hit.has(u)) continue;
          const to = v.subVectors(u.pos, start); to.y = 0;
          const along = to.dot(f), across = Math.abs(to.dot(side));
          if (along < 0 || along > front || across > a.width / 2) continue;
          hit.add(u); damage(G, u, a.dmg, h); knock(u, f.clone(), a.knock, 7);
          burst(G, chestOf(u), 0xbfe6ff, 1);
        }
      } });
      G.ev.shake?.(h, 0.7);
      return true;
    },
    ai: (G, b, a, c) => c.heroT && c.dist < a.range - 4,
  },

  // ---- Gloop ----
  puddle: {
    cast(G, h, a, ctx) {
      thrown(G, h, ctx, { dmg: 10, splash: 1.5, speed: 22, grav: 16, color: 0x7ee85a, size: 0.32, lift: 0.22,
        onExplode: (G2, p) => { p.y = groundAt(p, 0.2, G.colliders); addZone(G, { kind: 'goo', pos: p.clone(), radius: a.radius, life: a.dur, team: h.team, owner: h, hps: a.hps, slow: a.slow }); } });
      return true;
    },
    ai: (G, b, a, c) => (c.heroT && c.dist < 18) || b.hp < b.maxHp * 0.5,
  },
  gelform: {
    cast(G, h, a) {
      h.barrierT = a.dur; h.barrierM = a.mult;
      const before = h.hp; h.hp = Math.min(h.maxHp, h.hp + a.heal); setBar(h); G.ev.heal?.(h, h.hp - before, h);
      ring(G, h.pos, 0x8af06a, 2.4); burst(G, h.pos.clone().setY(1), 0x8af06a, 1.4);
      h.flinchA = 1;                                               // a big wobble
      return true;
    },
    ai: (G, b, a, c) => c.heroT && b.hp < b.maxHp * 0.55,
  },
  slimetime: {
    cast(G, h, a, ctx) {
      const p = aimPoint(G, h, ctx, 30);
      addZone(G, { kind: 'goo', pos: p.clone().setY(groundAt(p, 0.2, G.colliders)), radius: a.radius, life: a.dur, team: h.team, owner: h, hps: a.hps, dps: a.dps, slow: a.slow });
      ring(G, p, 0x8af06a, a.radius); ring(G, p, 0xffe14a, a.radius * 0.6);
      for (let i = 0; i < 26; i++) {                               // a wave of goo splashing up
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.2 + Math.random() * 0.25, 8, 6), BLOB_MAT);
        const ang = Math.random() * Math.PI * 2, r = Math.random() * a.radius;
        m.position.set(p.x + Math.cos(ang) * r, 0.3, p.z + Math.sin(ang) * r); G.scene.add(m);
        G.fx.push({ obj: m, life: 1.1, max: 1.1, kind: 'debris', vel: new THREE.Vector3((Math.random() - 0.5) * 3, 6 + Math.random() * 6, (Math.random() - 0.5) * 3), spin: 3 });
      }
      dropBlobs(G, h, { blobs: a.blobs, heal: 40, life: a.dur + 6 }, p);
      G.ev.shake?.(h, 0.4);
      return true;
    },
    ai: (G, b, a, c) => c.heroT && c.dist < 26,
  },

  // ---- Torque ----
  skate: {
    cast(G, h, a) {
      h.dashDir = dirFrom(h.yaw, 0); h.dashT = 0.4; h.dashSpeed = a.dist / 0.4; h.dashDmg = a.dmg; h.dashKnock = a.knock; h.dashHit = new Set();
      h.dashStun = 0; h.dashColor = 0xffc93c; h.dashSpin = false; h.dashMode = null; h.grabbed = null;
      h.momentum = 100;
      for (let i = 0; i < 3; i++) tracer(G, h.pos.clone().setY(0.15 + i * 0.05), h.pos.clone().addScaledVector(h.dashDir, -4).setY(0.15 + i * 0.05), i ? 0xffc93c : 0xff5a36, 0.5);
      return true;
    },
    ai: (G, b, a, c) => c.heroT && c.dist > 4 && c.dist < a.dist + 2,
  },
  spinout: {
    cast(G, h, a) {
      const m = h.momentum || 0, dmg = a.dmg * (1 + 1.5 * m / 100);
      ring(G, h.pos, 0xffc93c, a.radius); ring(G, h.pos, 0xff5a36, a.radius * 0.7);
      for (let i = 0; i < 12; i++) { const ang = i / 12 * Math.PI * 2; tracer(G, h.pos.clone().setY(1.1), h.pos.clone().add(new THREE.Vector3(Math.cos(ang) * a.radius, 1.1, Math.sin(ang) * a.radius)), i % 2 ? 0xffc93c : 0xff5a36, 0.25); }
      for (const u of [...enemiesOf(G, h), ...G.minions.filter(x => x.alive && x.team !== h.team)]) {
        if (Math.hypot(u.pos.x - h.pos.x, u.pos.z - h.pos.z) > a.radius) continue;
        damage(G, u, dmg, h); knock(u, flat(v.subVectors(u.pos, h.pos).setY(0.001)), a.knock * (0.5 + m / 200), 6);
        burst(G, chestOf(u), 0xffd23c, 0.8);
      }
      if (!(h.overdriveT > 0)) h.momentum = 0;
      return true;
    },
    ai: (G, b, a, c) => c.near(a.radius - 0.5) >= 1,
  },
  overdrive: {
    cast(G, h, a) {
      h.overdriveT = a.dur; h.momentum = 100;
      h.hasteT = a.dur; h.hasteSpeed = a.speed; h.hasteFire = a.fire;
      ring(G, h.pos, 0xffc93c, 3); burst(G, h.pos.clone().setY(1), 0xff5a36, 1.8);
      return true;
    },
    ai: (G, b, a, c) => c.heroT && c.dist < 16,
  },

  // ---- Nutcracker ----
  nutcluster: {
    cast(G, h, a, ctx) {
      const base = ctx.aim || dirFrom(h.yaw, h.pitch);
      for (let i = 0; i < a.count; i++) {
        const d = base.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), (i - (a.count - 1) / 2) * 0.16);
        G.timers.push({ t: i * 0.06, fn: () => h.alive && thrown(G, h, { aim: d }, { dmg: a.dmg, splash: a.splash, speed: 24 + i, grav: 18, color: 0x8a5a2a, size: 0.22, lift: 0.24 }) });
      }
      return true;
    },
    ai: (G, b, a, c) => c.tgt && c.dist > 5 && c.dist < 22,
  },
  cheeks: {
    cast(G, h, a) {
      const before = h.hp; h.hp = Math.min(h.maxHp, h.hp + a.heal); setBar(h); G.ev.heal?.(h, h.hp - before, h);
      h.reloadT = 0; h.ammo = h.def.weapon.mag;
      h.hasteT = Math.max(h.hasteT, a.dur); h.hasteSpeed = a.speed; h.hasteFire = Math.max(1, h.hasteFire || 1);
      burst(G, h.pos.clone().setY(1.7), 0xb5762e, 1); ring(G, h.pos, 0xd9822b, 2);
      return true;
    },
    ai: (G, b, a) => b.hp < b.maxHp * 0.55 || b.ammo < b.def.weapon.mag * 0.2,
  },
  megamech: {
    cast(G, h, a) {
      h.megaT = a.dur; h.barrierT = a.dur; h.barrierM = a.mult;
      h.hasteT = a.dur; h.hasteSpeed = 0.95; h.hasteFire = a.fire;
      h.reloadT = 0; h.ammo = h.def.weapon.mag;
      ring(G, h.pos, 0xd9822b, 4); burst(G, h.pos.clone().setY(1.4), 0xffffff, 2.2);
      G.ev.shake?.(h, 0.6);
      return true;
    },
    ai: (G, b, a, c) => c.heroT && c.dist < 22,
  },

  // ---- Larkspur ----
  volley: {
    cast(G, h, a, ctx) {
      const p = aimPoint(G, h, ctx, 60);
      ring(G, p, 0xd8ffb0, a.radius);
      for (let i = 0; i < a.arrows; i++) {
        G.timers.push({ t: 0.35 + i * 0.07, fn: () => {
          const ang = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * a.radius;
          spawnProjectile(G, h, new THREE.Vector3(p.x + Math.cos(ang) * r - 3, 22, p.z + Math.sin(ang) * r), new THREE.Vector3(5, -46, 0),
            { dmg: a.dmg, splash: a.splash, grav: 0, color: 0xd8ffb0, size: 0.06, arrow: true, trail: true });
        } });
      }
      return true;
    },
    ai: (G, b, a, c) => c.tgt && c.dist < 45,
  },
  leafstep: {
    cast(G, h, a) {
      const back = dirFrom(h.yaw, 0).multiplyScalar(-a.dist / 0.45);
      h.vel.set(back.x, 7, back.z); h.onGround = false; h.knockT = 0.45;
      h.invisT = a.dur; h.ambush = 1;
      for (let i = 0; i < 10; i++) {                                // a swirl of leaves left behind
        const m = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.1), new THREE.MeshBasicMaterial({ color: i % 3 ? 0x5fbf6a : 0xe8d27a, side: THREE.DoubleSide, transparent: true }));
        m.position.set(h.pos.x, h.pos.y + 1, h.pos.z); G.scene.add(m);
        G.fx.push({ obj: m, life: 1.2, max: 1.2, kind: 'debris', vel: new THREE.Vector3((Math.random() - 0.5) * 5, 2 + Math.random() * 3, (Math.random() - 0.5) * 5), spin: 8 });
      }
      return true;
    },
    ai: (G, b, a, c) => c.heroT && (c.dist < 8 || b.hp < b.maxHp * 0.4),
  },
  moonshot: {
    cast(G, h, a, ctx) {
      const o = eyeOf(h), d = (ctx.aim || dirFrom(h.yaw, h.pitch)).clone().normalize();
      const len = rayWorld(o, d, a.range, G.colliders), end = o.clone().addScaledVector(d, len);
      // the arrow: a fat glowing shaft with a white core, then sparkles along the line
      tracer(G, o.clone().setY(o.y - 0.15), end, 0xd8ffb0, 0.7, 4); tracer(G, o.clone().setY(o.y - 0.12), end, 0xffffff, 0.5, 2);
      for (let k = 1; k < 10; k++) burst(G, o.clone().lerp(end, k / 10), k % 2 ? 0xd8ffb0 : 0xe8d27a, 0.6);
      for (const u of [...G.heroes, ...G.minions, ...G.structures]) {
        if (!u.alive || u.team === h.team) continue;
        const c = chestOf(u), along = v.subVectors(c, o).dot(d);
        if (along < 0 || along > len) continue;
        if (c.distanceTo(o.clone().addScaledVector(d, along)) > a.width + (u.rad || 0)) continue;
        damage(G, u, a.dmg, h);
        if (u.kind === 'hero' && u.alive) { u.markT = a.mark; u.markAmp = a.amp; breakInvis(u); G.ev.flash?.(u, 'Moonstruck'); }
      }
      G.ev.shake?.(h, 0.5);
      return true;
    },
    ai: (G, b, a, c) => c.heroT && c.dist < 60,
  },

  // ---- Pirouette ----
  pirouette: {
    cast(G, h, a) {
      h.dashDir = dirFrom(h.yaw, 0); h.dashT = 0.45; h.dashSpeed = a.dist / 0.45; h.dashDmg = a.dmg; h.dashKnock = a.knock; h.dashHit = new Set();
      h.dashStun = 0; h.dashColor = 0xff8fc0; h.dashSpin = false; h.dashMode = null; h.grabbed = null; h.twirlT = 0.45;
      for (let i = 0; i < 6; i++) { const ang = i / 6 * Math.PI * 2; tracer(G, h.pos.clone().setY(0.3), h.pos.clone().add(new THREE.Vector3(Math.cos(ang) * 1.4, 1.6, Math.sin(ang) * 1.4)), i % 2 ? 0xff8fc0 : 0xffffff, 0.35); }
      return true;
    },
    ai: (G, b, a, c) => c.heroT && c.dist > 3 && c.dist < a.dist,
  },
  duet: {
    cast(G, h, a, ctx) {
      // the ally closest to where you're facing, in range and in sight; otherwise yourself
      const d = (ctx.aim || dirFrom(h.yaw, h.pitch)).clone().normalize(), o = eyeOf(h);
      let pick = null, best = 0.8;
      for (const u of alliesOf(G, h)) {
        if (u === h) continue;
        const to = chestOf(u).sub(o), dist = to.length();
        if (dist > a.range) continue;
        const dot = to.normalize().dot(d);
        if (dot > best && hasLOS(o, chestOf(u), G.colliders)) { best = dot; pick = u; }
      }
      if (!pick && ctx.target && ctx.target.team === h.team) pick = ctx.target;
      for (const u of pick ? [h, pick] : [h]) {
        if (u === pick || !pick) { const b = u.hp; u.hp = Math.min(u.maxHp, u.hp + a.heal); setBar(u); G.ev.heal?.(u, u.hp - b, h); }
        haste(u, a.dur, a.speed);
        ring(G, u.pos, 0xff8fc0, 1.8); burst(G, chestOf(u), 0xfff0f6, 1);
      }
      if (pick) { tracer(G, chestOf(h), chestOf(pick), 0xff8fc0, 0.5, 2); G.ev.flash?.(pick, 'Pas de deux'); }
      return true;
    },
    ai: (G, b, a) => b.hp < b.maxHp * 0.6 || alliesOf(G, b).some(u => u !== b && u.hp < u.maxHp * 0.55 && u.pos.distanceTo(b.pos) < a.range),
  },
  swanlake: {
    cast(G, h, a) {
      addZone(G, { kind: 'stage', pos: h.pos.clone().setY(0), radius: a.radius, life: a.dur, team: h.team, owner: h, hps: a.hps, slow: a.slow, haste: a.haste });
      ring(G, h.pos, 0xff8fc0, a.radius); ring(G, h.pos, 0xffffff, a.radius * 0.6);
      return true;
    },
    ai: (G, b, a, c) => c.heroT && c.dist < a.radius + 4,
  },

  // ---- Burrow ----
  molehole: {
    cast(G, h, a) {
      if (!h.onGround) return false;
      digHole(G, h, a);
      return true;
    },
    // bots dig one hole near where they start, then another once they've walked well away from it
    ai: (G, b, a, c) => {
      if (c.heroT || !b.onGround) return false;
      const mine = holesOf(G, b);
      return !mine.length || (mine.length < 2 ? mine[0].pos.distanceTo(b.pos) > 22 : Math.min(...mine.map(x => x.pos.distanceTo(b.pos))) > 30);
    },
  },
  popup: {
    cast(G, h, a) {
      const mine = holesOf(G, h);
      if (mine.length < 2) return false;
      const far = mine.reduce((x, y) => x.pos.distanceTo(h.pos) > y.pos.distanceTo(h.pos) ? x : y);
      burst(G, h.pos.clone().setY(h.pos.y + 0.4), 0x7a5a3a, 1.2);
      tunnel(G, h, far);
      h.vel.y = 8; h.onGround = false;
      ring(G, h.pos, 0xc9a14a, a.radius); burst(G, h.pos.clone().setY(0.6), 0x7a5a3a, a.radius * 0.7);
      for (const u of [...enemiesOf(G, h), ...G.minions.filter(m => m.alive && m.team !== h.team && !m.deploy)]) {
        if (Math.hypot(u.pos.x - h.pos.x, u.pos.z - h.pos.z) > a.radius) continue;
        damage(G, u, a.dmg, h); knock(u, flat(v.subVectors(u.pos, h.pos).setY(0.001)), 3, a.lift);
      }
      G.ev.shake?.(h, 0.35);
      return true;
    },
    ai: (G, b, a, c) => holesOf(G, b).length === 2 && ((c.heroT && b.hp < b.maxHp * 0.4) || (!c.heroT && Math.max(...holesOf(G, b).map(x => x.pos.distanceTo(b.pos))) > 35)),
  },
  cavein: {
    cast(G, h, a, ctx) {
      const p = aimPoint(G, h, ctx, 34);
      ring(G, p, 0xc9a14a, a.radius);
      for (let i = 0; i < 18; i++) {                               // rocks tumble down first
        const ang = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * a.radius;
        const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.35, 0), new THREE.MeshStandardMaterial({ color: i % 3 ? 0x7a6a5a : 0x9a8a72, roughness: 0.9, transparent: true }));
        m.position.set(p.x + Math.cos(ang) * r, 14 + Math.random() * 4, p.z + Math.sin(ang) * r); G.scene.add(m);
        G.fx.push({ obj: m, life: 1.1, max: 1.1, kind: 'debris', vel: new THREE.Vector3(0, -16, 0), spin: 4 });
      }
      G.timers.push({ t: 0.75, fn: () => {
        ring(G, p, 0x7a5a3a, a.radius); burst(G, p.clone().setY(0.6), 0x9a8a72, a.radius * 0.8);
        for (const u of [...G.heroes, ...G.minions]) {
          if (!u.alive || u.team === h.team || Math.hypot(u.pos.x - p.x, u.pos.z - p.z) > a.radius) continue;
          damage(G, u, a.dmg, h); stun(u, a.stun);
          if (u.kind === 'hero') G.ev.flash?.(u, 'Buried');
        }
        G.ev.shake?.(h, 0.8);
      } });
      return true;
    },
    ai: (G, b, a, c) => c.heroT && c.dist < 28,
  },

  // ---- Stitch ----
  medbomb: {
    cast(G, h, a, ctx) {
      thrown(G, h, ctx, { dmg: 0, splash: 0, speed: 24, grav: 16, color: 0x7affc0, size: 0.2, lift: 0.22, noDirect: true,
        onExplode: (G2, p) => {
          ring(G, p, 0x7affc0, a.splash); burst(G, p, 0xffffff, a.splash * 0.45); burst(G, p, 0x7affc0, a.splash * 0.8);
          for (const u of [...G.heroes, ...G.minions]) {
            if (!u.alive || u.deploy || chestOf(u).distanceTo(p) > a.splash + 0.5) continue;
            if (u.team === h.team) { if (u.kind === 'hero') mend(G, h, u, a.heal); }
            else damage(G, u, a.dmg, h);
          }
        } });
      return true;
    },
    ai: (G, b, a, c) => alliesOf(G, b).some(u => u.hp < u.maxHp * 0.7 && u.pos.distanceTo(b.pos) < 18) || (c.heroT && c.dist < 18),
  },
  lifeline: {
    cast(G, h, a, ctx) {
      const u = facedAlly(G, h, ctx, a.range) || h;
      mend(G, h, u, a.heal); protect(u, a.mult, a.dur);
      ring(G, u.pos, 0x7affc0, 1.6); burst(G, chestOf(u), 0x7affc0, 1);
      if (u !== h) { tracer(G, chestOf(h), chestOf(u), 0x7affc0, 0.5, 2); G.ev.flash?.(u, 'Lifeline'); }
      return true;
    },
    ai: (G, b, a) => b.hp < b.maxHp * 0.45 || alliesOf(G, b).some(u => u !== b && u.hp < u.maxHp * 0.5 && u.pos.distanceTo(b.pos) < a.range),
  },
  codeblue: {
    cast(G, h, a) {
      ring(G, h.pos, 0x7affc0, a.radius); ring(G, h.pos, 0xffffff, a.radius * 0.5);
      for (const u of alliesOf(G, h)) {
        if (u.pos.distanceTo(h.pos) > a.radius) continue;
        mend(G, h, u, a.heal); protect(u, a.mult, a.dur);
        burst(G, chestOf(u), 0x7affc0, 1.4);
        if (u !== h) { tracer(G, chestOf(h), chestOf(u), 0xffffff, 0.6, 2); G.ev.flash?.(u, 'Code Blue'); }
      }
      return true;
    },
    ai: (G, b, a) => alliesOf(G, b).filter(u => u.hp < u.maxHp * 0.6 && u.pos.distanceTo(b.pos) < a.radius).length >= 2 || b.hp < b.maxHp * 0.3,
  },

  // ---- Dynamo ----
  jumpstart: {
    cast(G, h, a, ctx) {
      const u = facedAlly(G, h, ctx, a.range) || h;
      mend(G, h, u, 0, a.boost);
      u.cd.q = Math.max(0, u.cd.q - a.cut); u.cd.ability = Math.max(0, u.cd.ability - a.cut);
      if (u !== h) { zap(G, chestOf(h), chestOf(u)); G.ev.flash?.(u, 'Jump started!'); }
      ring(G, u.pos, 0xffe14a, 1.6); burst(G, chestOf(u), 0xffe14a, 1.1);
      return true;
    },
    ai: (G, b, a) => alliesOf(G, b).some(u => u !== b && u.ult < 85 && u.pos.distanceTo(b.pos) < a.range) || b.ult < 60,
  },
  pylon: {
    cast(G, h, a) {
      addZone(G, { kind: 'pylon', pos: h.pos.clone(), radius: a.radius, life: a.dur, team: h.team, owner: h, boost: a.rate, haste: a.speed });
      ring(G, h.pos, 0xffe14a, a.radius); burst(G, h.pos.clone().setY(h.pos.y + 1.6), 0xffe14a, 1.2);
      return true;
    },
    ai: (G, b, a, c) => c.alliesNear(9) >= 1 || (c.heroT && c.dist < 20),
  },
  overcharge: {
    cast(G, h, a) {
      ring(G, h.pos, 0xffe14a, a.radius); ring(G, h.pos, 0x7af0ff, a.radius * 0.5);
      for (const u of alliesOf(G, h)) {
        if (u === h || u.pos.distanceTo(h.pos) > a.radius) continue;
        mend(G, h, u, 0, a.boost); haste(u, a.dur, 1, a.fire);
        zap(G, chestOf(h), chestOf(u)); burst(G, chestOf(u), 0xffe14a, 1.3); G.ev.flash?.(u, 'Overcharged!');
      }
      haste(h, a.dur, 1, a.fire);
      G.ev.shake?.(h, 0.3);
      return true;
    },
    ai: (G, b, a, c) => c.alliesNear(a.radius) >= 2 || (c.alliesNear(a.radius) >= 1 && c.heroT),
  },

  // ---- Mortar ----
  brick: {
    cast(G, h, a, ctx) {
      const s = blockSpot(G, h, ctx, a.range);
      return !!(s && build(G, h, s.x, s.z, s.bottom, a.life));
    },
    // cover between the bot and whoever it's fighting
    ai: (G, b, a, c) => c.heroT && c.dist < 24 && blocksOf(G, b).length < 5,
  },
  pillar: {
    cast(G, h, a) {
      if (!h.onGround) return false;
      const x = cellOf(h.pos.x), z = cellOf(h.pos.z), bottom = groundAt(v.set(x, h.pos.y + 0.05, z), 0.05, G.colliders);
      let made = 0;
      for (let i = 0; i < a.n; i++) if (build(G, h, x, z, bottom + i * BLOCK.h, a.life)) made++;
      if (!made) return false;
      h.vel.y = Math.max(h.vel.y, 3); burst(G, h.pos.clone(), 0xd9733a, 1.2);
      return true;
    },
    ai: (G, b, a, c) => c.heroT && b.onGround && c.dist > 8 && c.dist < 40,
  },
  fortress: {
    cast(G, h, a, ctx) {
      const p = aimPoint(G, h, ctx, a.range), S = BLOCK.size, x0 = cellOf(p.x), z0 = cellOf(p.z);
      // a 5x5 ring of walls with a doorway on the side facing Mortar, and a lookout block in the middle
      const dx = h.pos.x - x0, dz = h.pos.z - z0;
      const door = Math.abs(dx) > Math.abs(dz) ? [Math.sign(dx) * 2, 0] : [0, Math.sign(dz) * 2];
      for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
        const edge = Math.max(Math.abs(i), Math.abs(j)) === 2, mid = !i && !j;
        if ((!edge && !mid) || (i === door[0] && j === door[1])) continue;
        const x = x0 + i * S, z = z0 + j * S, b0 = groundAt(v.set(x, p.y + 0.5, z), 0.05, G.colliders);
        for (let k = 0; k < (mid ? 1 : a.wall); k++) placeBlock(G, h, x, z, b0 + k * BLOCK.h, a.dur, true);
      }
      addZone(G, { kind: 'fort', pos: new THREE.Vector3(x0, p.y, z0), radius: S * 2.5, life: a.dur, team: h.team, owner: h, mult: a.mult });
      ring(G, p, 0xff8a2a, S * 2.5); G.ev.shake?.(h, 0.5);
      return true;
    },
    ai: (G, b, a, c) => c.heroT && c.dist < 22,
  },

  // ---- Beef Wellington ----
  roast: {
    cast(G, h, a, ctx) {
      thrown(G, h, ctx, { dmg: 0, splash: 0, speed: 20, grav: 18, color: 0xd9a441, size: 0.26, lift: 0.2, noDirect: true, box: true,
        onExplode: (G2, p) => {
          const at = p.clone(); at.y = groundAt(at, 0.1, G.colliders);
          dropBlobs(G, h, { blobs: a.blobs, heal: a.heal, life: a.life, geo: PUD_GEO, mat: PUD_MAT, color: 0xffd27a }, at);
          ring(G, at, 0xffd27a, 2.4);
        } });
      return true;
    },
    ai: (G, b, a) => alliesOf(G, b).some(u => u.hp < u.maxHp * 0.65 && u.pos.distanceTo(b.pos) < 16),
  },
  crust: {
    cast(G, h, a, ctx) {
      const u = facedAlly(G, h, ctx, a.range) || h;
      mend(G, h, u, a.heal); protect(u, a.mult, a.dur);
      ring(G, u.pos, 0xe0a548, 1.6); burst(G, chestOf(u), 0xffd27a, 1.2);
      if (u !== h) { tracer(G, chestOf(h), chestOf(u), 0xe0a548, 0.5, 2); G.ev.flash?.(u, 'Wrapped in pastry'); }
      return true;
    },
    ai: (G, b, a) => b.hp < b.maxHp * 0.45 || alliesOf(G, b).some(u => u !== b && u.hp < u.maxHp * 0.5 && u.pos.distanceTo(b.pos) < a.range),
  },
  banquet: {
    cast(G, h, a) {
      ring(G, h.pos, 0xffd27a, a.radius); ring(G, h.pos, 0xffffff, a.radius * 0.5);
      for (const u of alliesOf(G, h)) {
        if (u.pos.distanceTo(h.pos) > a.radius) continue;
        haste(u, a.dur, a.speed);
        for (let k = 0; k < a.dur; k++) G.timers.push({ t: k + 0.05, fn: () => { if (u.alive) { mend(G, h, u, a.hps); burst(G, chestOf(u), 0xffd27a, 0.6); } } });
        if (u !== h) G.ev.flash?.(u, 'Dinner is served!');
      }
      return true;
    },
    ai: (G, b, a) => alliesOf(G, b).filter(u => u.hp < u.maxHp * 0.6 && u.pos.distanceTo(b.pos) < a.radius).length >= 2 || b.hp < b.maxHp * 0.3,
  },

  // ---- Crook ----
  pen: {
    cast(G, h, a, ctx) {
      thrown(G, h, ctx, { dmg: 0, splash: 0, speed: 22, grav: 18, color: 0x8a5a3a, size: 0.2, lift: 0.22, noDirect: true,
        onExplode: (G2, p) => { const at = p.clone(); at.y = groundAt(at, 0.1, G.colliders); addZone(G, { kind: 'pen', pos: at, radius: a.radius, life: a.dur, team: h.team, owner: h, slow: a.slow, dps: a.dps }); } });
      return true;
    },
    ai: (G, b, a, c) => c.heroT && c.dist < 20,
  },
  counting: {
    cast(G, h, a, ctx) {
      const p = aimPoint(G, h, ctx, a.range);
      ring(G, p, 0xffffff, a.radius); ring(G, p, 0x6a9a5a, a.radius * 0.7);
      let n = 0;
      for (const u of enemiesOf(G, h)) {
        if (Math.hypot(u.pos.x - p.x, u.pos.z - p.z) > a.radius) continue;
        stun(u, a.dur); sheepify(G, u, a.dur); n++;
        G.ev.flash?.(u, 'Baa!');
      }
      for (const m of G.minions) if (m.alive && m.team !== h.team && !m.deploy && Math.hypot(m.pos.x - p.x, m.pos.z - p.z) < a.radius) stun(m, a.dur);
      burst(G, p.clone().setY(p.y + 1), 0xffffff, a.radius * 0.6);
      return true;
    },
    ai: (G, b, a, c) => c.heroT && c.dist < 26,
  },

  // ---- The Microwave ----
  popcorn: {
    cast(G, h, a, ctx) {
      thrown(G, h, ctx, { dmg: 0, splash: 0, speed: 22, grav: 16, color: 0xff4f6b, size: 0.22, lift: 0.22, noDirect: true, box: true,
        onExplode: (G2, p) => {
          burst(G, p, 0xfff6d8, 1.4);
          for (let i = 0; i < a.kernels; i++) {
            const ang = i / a.kernels * Math.PI * 2 + Math.random() * 0.4, sp = 4 + Math.random() * 4;
            spawnProjectile(G, h, p.clone().setY(p.y + 0.4), new THREE.Vector3(Math.cos(ang) * sp, 6 + Math.random() * 4, Math.sin(ang) * sp),
              { dmg: a.dmg, splash: a.splash, grav: 20, color: i % 2 ? 0xfff6d8 : 0xffe08a, size: 0.12, child: true });
          }
        } });
      return true;
    },
    ai: (G, b, a, c) => c.heroT && c.dist < 18,
  },
  reheat: {
    cast(G, h, a) {
      protect(h, a.mult, a.dur);
      addZone(G, { kind: 'heat', pos: h.pos.clone(), radius: a.radius, life: a.dur, team: h.team, owner: h, dps: a.dps, follow: h });
      burst(G, chestOf(h), 0xffd27a, 1.4);
      return true;
    },
    ai: (G, b, a, c) => c.heroT && (c.dist < a.radius + 2 || b.hp < b.maxHp * 0.5),
  },
  meltdown: {
    cast(G, h, a) {
      ring(G, h.pos, 0xffd27a, a.radius);
      for (let k = 1; k <= 3; k++) G.timers.push({ t: a.delay * k / 4, fn: () => { if (h.alive) ring(G, h.pos, k % 2 ? 0xffd27a : 0xffffff, a.radius * (0.4 + k * 0.2)); } });
      G.timers.push({ t: a.delay, fn: () => {
        if (!h.alive) return;
        ring(G, h.pos, 0xffffff, a.radius); burst(G, chestOf(h), 0xffd27a, a.radius * 0.7); burst(G, chestOf(h), 0xffffff, a.radius * 0.35);
        for (const u of [...enemiesOf(G, h), ...G.minions.filter(m => m.alive && m.team !== h.team && !m.deploy), ...G.structures.filter(s => s.alive && s.team !== h.team)]) {
          if (Math.hypot(u.pos.x - h.pos.x, u.pos.z - h.pos.z) > a.radius + (u.rad || 0)) continue;
          damage(G, u, a.dmg, h);
          if (u.vel) knock(u, flat(v.subVectors(u.pos, h.pos).setY(0.001)), a.knock, 7);
        }
        G.ev.shake?.(h, 0.8); G.ev.flash?.(h, 'DING!');
      } });
      return true;
    },
    ai: (G, b, a, c) => c.heroT && c.dist < a.radius - 1,
  },
};

// Cast a slot ('q', 'ability' or 'ult'). ctx: { wish, aim, target }.
export function castSlot(G, h, slot, ctx = {}) {
  const a = h.def[slot];
  if (!h.alive || !canAct(h) || !a) return false;
  if (slot === 'ult' ? h.ult < 100 : h.cd[slot] > 0) return false;
  if (!ABIL[a.id].cast(G, h, a, ctx)) return false;
  if (slot === 'ult') h.ult = 0; else { h.cd[slot] = a.cd; onCast(G, h, slot); }
  if (a.id === 'blink' && h.rushT > 0) h.cd.ability = h.def.ult.blinkCd || 1;
  if (a.id !== 'vanish') breakInvis(h);
  h.castA = slot === 'ult' ? 1.6 : 1; h.castSlot = slot;
  G.ev.ability(h, slot);
  if (G.net && h.local) G.net.cast(h, slot, ctx);
  return true;
}

// Online: play a remote hero's cast here (cooldowns are theirs to track). Its damage is
// ignored locally, but pushes, pulls, stuns and heals land on our own hero as they would.
export function replayCast(G, h, slot, ctx) {
  const a = h.def[slot];
  if (!a || !ABIL[a.id].cast(G, h, a, ctx)) return;
  h.castA = slot === 'ult' ? 1.6 : 1; h.castSlot = slot;
  G.ev.ability(h, slot);
}

// ---------- passives ----------
// One per hero, always on. Hooks: damage dealt and taken, eliminations, casts and a per-frame tick.
const pasId = u => u?.kind === 'hero' ? u.def.passive?.id : null;
const mine = (G, h) => !G.net || h.local;                      // online, each machine runs its own hero's passive
function healBy(G, u, amt, src) {
  if (!u.alive || u.hp >= u.maxHp || amt <= 0) return;
  const before = u.hp; u.hp = Math.min(u.maxHp, u.hp + amt); setBar(u); G.ev.heal?.(u, u.hp - before, src);
}
function haste(h, dur, speed, fire = 1) {
  if (h.hasteT <= 0) { h.hasteSpeed = 1; h.hasteFire = 1; }
  h.hasteT = Math.max(h.hasteT, dur); h.hasteSpeed = Math.max(h.hasteSpeed, speed); h.hasteFire = Math.max(h.hasteFire, fire);
}
const proc = (G, h, text) => { G.ev.passive?.(h); if (text) G.ev.flash?.(h, text); };

// Extra damage from the attacker's passive.
export function dealtMult(src, t) {
  const id = pasId(src);
  if (id === 'aloft' && !src.onGround && src.airT > 0.25) return src.def.passive.amp;
  if (id === 'keeneye' && src.pos.distanceTo(t.pos) > src.def.passive.range) return src.def.passive.mult;
  if (id === 'highground' && src.onBlock) return src.def.passive.amp;
  if (id === 'shear' && t && (t.slowT > 0 || t.stunT > 0 || t.rootT > 0 || t.zoneSlow < 1)) return src.def.passive.mult;
  return 1;
}
// Damage reduction from the target's own passive.
export function passiveTaken(h) {
  const id = pasId(h), p = h.def?.passive;
  if (id === 'ballast' && h.hp < h.maxHp * p.below) return p.mult;
  if (id === 'shocks' && h.momentum >= 99) return p.mult;
  if (id === 'enpointe' && Math.hypot(h.vel.x, h.vel.z) > p.speed) return p.mult;
  return 1;
}
// After a hit lands. `srcOnly` skips effects on a target owned by another machine.
export function onDealt(G, src, t, amt, head, srcOnly) {
  const id = pasId(src), p = src?.def?.passive;
  if (!id || !src.alive || t.kind !== 'hero' || t.team === src.team || amt <= 0) return;
  if (id === 'afterburn' && !srcOnly) { t.burnT = p.dur; t.burnDps = p.dps; t.burnSrc = src; }
  else if (id === 'lastlight' && head && mine(G, src)) {
    healBy(G, src, p.self, src);
    for (const u of alliesOf(G, src)) if (u !== src && u.pos.distanceTo(src.pos) < p.radius) healBy(G, u, p.ally, src);
    ring(G, src.pos, 0xb98cff, p.radius); proc(G, src);
  }
  else if (id === 'hunger' && mine(G, src) && (t.slowT > 0 || t.stunT > 0 || t.rootT > 0)) healBy(G, src, amt * p.frac, src);
}
// After the target loses health. Returns true if the passive saved it from being knocked out.
export function onHurt(G, h) {
  const id = pasId(h), p = h.def?.passive;
  if (id === 'eject' && h.hp <= 0 && !h.ejected) {
    h.ejected = true; h.hp = p.hp; h.vel.y = p.lift; h.onGround = false;
    burst(G, chestOf(h), 0xd9822b, 1.6); proc(G, h, 'Ejector seat!');
    return true;
  }
  if (id === 'smoke' && h.hp > 0 && h.hp < h.maxHp * p.below && G.time >= (h.smokeReadyT || 0)) {
    h.smokeReadyT = G.time + p.cd; h.invisT = Math.max(h.invisT, p.dur);
    burst(G, chestOf(h), 0xd94fa0, 1.4); proc(G, h, 'Poof!');
  }
  return false;
}
// A hero was knocked out (here or on another machine).
export function onKill(G, t, src) {
  if (t.kind !== 'hero') return;
  if (pasId(src) === 'tailwind' && src.alive && mine(G, src)) {
    const p = src.def.passive; src.cd.ability = 0; haste(src, p.dur, p.speed); proc(G, src, 'Tailwind!');
  }
  for (const h of G.heroes) {
    if (!h.alive || h === t || !mine(G, h)) continue;
    const id = pasId(h), p = h.def.passive, near = h.pos.distanceTo(t.pos);
    if (id === 'salvage' && t.team !== h.team && near < p.radius) { h.cd.ability = Math.max(0, h.cd.ability - p.cut); healBy(G, h, p.heal, h); proc(G, h, 'Salvaged'); }
    if (id === 'chivalry' && t.team === h.team && near < p.radius) { haste(h, p.dur, p.speed, p.fire); proc(G, h, 'For honour!'); }
  }
}
function onCast(G, h, slot) {
  if (pasId(h) === 'remix' && slot !== 'ult') { const o = slot === 'q' ? 'ability' : 'q'; h.cd[o] = Math.max(0, h.cd[o] - h.def.passive.cut); }
}
// Every frame: burns, and regrowth after staying out of trouble.
function tickPassive(G, h, dt) {
  if (pasId(h) === 'insulated') { for (const k of ['slowT', 'burnT', 'bleedT']) if (h[k] > 0) h[k] -= dt; }   // wears off twice as fast
  if (pasId(h) === 'highground') h.onBlock = h.onGround && (G.blocks || []).some(b => b.owner === h && Math.abs(h.pos.y - b.collider.top) < 0.15
    && h.pos.x > b.collider.minX - 0.3 && h.pos.x < b.collider.maxX + 0.3 && h.pos.z > b.collider.minZ - 0.3 && h.pos.z < b.collider.maxZ + 0.3);
  if (h.burnT > 0) {
    h.burnT -= dt;
    if (h.alive && mine(G, h)) damage(G, h, h.burnDps * dt, h.burnSrc, false, true, true);
    if (Math.random() < dt * 8) burst(G, chestOf(h).add(v.set((Math.random() - 0.5) * 0.5, Math.random() * 0.6, (Math.random() - 0.5) * 0.5)), 0xff8a3c, 0.25);
  }
  if (pasId(h) === 'photo' && h.alive && mine(G, h)) {
    const p = h.def.passive, on = G.time - h.lastHurtT > p.delay && h.hp < h.maxHp;
    if (on && !h.photoOn) proc(G, h);
    h.photoOn = on;
    if (on) { h.hp = Math.min(h.maxHp, h.hp + p.hps * dt); setBar(h); }
  }
}

// ---------- Burrow's tunnels ----------
// Each Burrow keeps two holes. Step into one (on foot) to pop out of the other; teammates can
// use them too. Holes are dug by the cast, so online every machine digs the same ones.
export const holesOf = (G, h) => (G.holes || []).filter(x => x.owner === h);
function digHole(G, h, a) {
  G.holes ||= [];
  const mine = holesOf(G, h);
  if (mine.length >= 2) dropHole(G, mine[0]);
  const pos = h.pos.clone(); pos.y = groundAt(pos, 0.3, G.colliders);
  const g = new THREE.Group(); g.position.copy(pos);
  const pit = new THREE.Mesh(new THREE.CircleGeometry(0.85, 24), new THREE.MeshBasicMaterial({ color: 0x120c08 }));
  pit.rotation.x = -Math.PI / 2; pit.position.y = 0.05; g.add(pit);
  const mound = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.24, 8, 24), new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 0.95 }));
  mound.rotation.x = -Math.PI / 2; mound.position.y = 0.08; mound.scale.z = 0.6; mound.castShadow = true; g.add(mound);
  for (let i = 0; i < 6; i++) {                                    // clods of dirt around the rim
    const c = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12 + Math.random() * 0.08, 0), mound.material);
    const ang = i / 6 * Math.PI * 2 + Math.random() * 0.5; c.position.set(Math.cos(ang) * 1.25, 0.08, Math.sin(ang) * 1.25); g.add(c);
  }
  const swirl = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.7, 24, 1, 0, Math.PI * 1.4), new THREE.MeshBasicMaterial({ color: TEAM_COLOR[h.team], transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }));
  swirl.rotation.x = -Math.PI / 2; swirl.position.y = 0.07; g.add(swirl);
  // a little sign post with a team flag so you can spot your holes from a distance
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.5, 6), new THREE.MeshStandardMaterial({ color: 0x6b4a33 }));
  post.position.set(1.1, 0.75, 0); g.add(post);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.36), new THREE.MeshStandardMaterial({ color: TEAM_COLOR[h.team], side: THREE.DoubleSide, emissive: TEAM_COLOR[h.team], emissiveIntensity: 0.3 }));
  flag.position.set(1.38, 1.3, 0); g.add(flag);
  const hat = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xffc93c }));
  hat.position.set(1.1, 1.5, 0); g.add(hat);
  G.scene.add(g);
  G.holes.push({ owner: h, team: h.team, pos, g, swirl, life: a.life, t: 0 });
  burst(G, pos.clone().setY(pos.y + 0.4), 0x7a5a3a, 1.3);
  G.ev.flash?.(h, mine.length ? 'Tunnel linked!' : 'Hole dug');
}
function dropHole(G, x) { G.scene.remove(x.g); G.holes.splice(G.holes.indexOf(x), 1); }
// Pop out next to hole `to`, on the side that isn't blocked.
function tunnel(G, u, to) {
  const ang = Math.random() * Math.PI * 2;
  u.pos.set(to.pos.x + Math.cos(ang) * 1.6, to.pos.y, to.pos.z + Math.sin(ang) * 1.6);
  resolveXZ(u.pos, u.radius || 0.45, G.colliders); u.pos.y = groundAt(u.pos, 0.3, G.colliders);
  u.vel.set(0, 6, 0); u.onGround = false; u.tunnelCd = 2;
  if (u.hist) u.hist.length = 0;                                   // no rewinding back through the dirt
  burst(G, to.pos.clone().setY(to.pos.y + 0.6), 0x7a5a3a, 1.4); ring(G, to.pos, 0xc9a14a, 1.6);
  G.ev.tunnel?.(u);
}
function tickHoles(G, dt) {
  const list = G.holes; if (!list) return;
  for (let i = list.length - 1; i >= 0; i--) {
    const x = list[i];
    x.life -= dt; x.t += dt;
    x.g.scale.setScalar(Math.min(1, x.t * 4) * Math.min(1, x.life * 2));
    x.swirl.rotation.z -= dt * 2.5;
    if (x.life <= 0 || !x.owner) { dropHole(G, x); continue; }
  }
  for (const x of list) {
    const pair = holesOf(G, x.owner);
    if (pair.length < 2) continue;
    const other = pair[0] === x ? pair[1] : pair[0];
    const open = pasId(x.owner) === 'network';
    for (const u of G.heroes) {
      if (!u.alive || u.team !== x.team || (u !== x.owner && !open) || !mine(G, u) || (u.tunnelCd || 0) > 0 || !u.onGround) continue;
      if (Math.hypot(u.pos.x - x.pos.x, u.pos.z - x.pos.z) > 0.9 || Math.abs(u.pos.y - x.pos.y) > 0.6) continue;
      burst(G, x.pos.clone().setY(x.pos.y + 0.4), 0x7a5a3a, 1);
      tunnel(G, u, other);
      if (u !== x.owner) G.ev.flash?.(u, 'Tunnelled!');
    }
  }
}

// ---------- Stitch and Dynamo: helping teammates ----------
// Heal and/or super-charge a teammate. Healing also fills the healer's own super.
export function mend(G, src, u, heal = 0, boost = 0) {
  if (!u?.alive || !src) return 0;
  let got = 0;
  if (heal > 0 && u.hp < u.maxHp) {
    const b = u.hp; healBy(G, u, heal, src); got = u.hp - b;
    if (src.kind === 'hero' && src.def?.ult) src.ult = Math.min(100, src.ult + got / src.def.ult.cost * 100);
    if (pasId(src) === 'bedside' && u !== src) healBy(G, src, got * src.def.passive.frac, src);
    if (pasId(src) === 'seasoned' && u !== src && got > 0) { const p = src.def.passive; u.rallyAmp = u.rallyT > 0 ? Math.max(u.rallyAmp, p.amp) : p.amp; u.rallyT = Math.max(u.rallyT, p.dur); }
  }
  if (boost > 0 && u.kind === 'hero' && u.ult < 100) {
    const b = u.ult; u.ult = Math.min(100, u.ult + boost); got += u.ult - b;
    if (pasId(src) === 'feedback' && u !== src) src.ult = Math.min(100, src.ult + (u.ult - b) * src.def.passive.frac);
    if (u.ult >= 100 && b < 100 && boost > 0.5) G.ev.flash?.(u, 'Super ready!');
  }
  return got;
}
// The teammate closest to where you're facing, in range and in sight.
function facedAlly(G, h, ctx, range) {
  const d = (ctx.aim || dirFrom(h.yaw, h.pitch)).clone().normalize(), o = eyeOf(h);
  let pick = null, best = 0.8;
  for (const u of alliesOf(G, h)) {
    if (u === h) continue;
    const to = chestOf(u).sub(o), dist = to.length();
    if (dist > range) continue;
    const dot = to.normalize().dot(d);
    if (dot > best && hasLOS(o, chestOf(u), G.colliders)) { best = dot; pick = u; }
  }
  if (!pick && ctx.target && ctx.target.kind === 'hero' && ctx.target.team === h.team && ctx.target !== h) pick = ctx.target;
  return pick;
}
// Take less damage for a while, keeping any stronger shield already up.
function protect(u, mult, dur) {
  u.barrierM = u.barrierT > 0 ? Math.min(u.barrierM, mult) : mult;
  u.barrierT = Math.max(u.barrierT, dur);
}
// A jagged lightning bolt between two points.
function zap(G, a, b, color = 0xffe14a) {
  let prev = a.clone();
  for (let k = 1; k <= 5; k++) {
    const p = a.clone().lerp(b, k / 5);
    if (k < 5) p.add(new THREE.Vector3((Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6));
    tracer(G, prev, p, k % 2 ? color : 0xffffff, 0.3, 1.5); prev = p;
  }
}

// ---------- Mortar's blocks ----------
// Blocks snap to a 2m grid and stack on the ground, map boxes and each other. Each Mortar keeps
// up to BLOCK.max from Build Block and Scaffold; the fort from his super doesn't count.
// Blocks are made by the cast, so online every machine builds the same ones.
const BLOCK = { size: 2, h: 1.2, max: 8, top: 9 };
const cellOf = x => (Math.floor(x / BLOCK.size) + 0.5) * BLOCK.size;
export const blocksOf = (G, h) => (G.blocks || []).filter(b => b.owner === h && !b.fort);
const BLOCK_GEO = new THREE.BoxGeometry(BLOCK.size, BLOCK.h, BLOCK.size), CAP_GEO = new THREE.BoxGeometry(BLOCK.size * 0.96, 0.06, BLOCK.size * 0.96);
let brickMat = null;
const capMats = {};
function brickMaterial() {
  if (brickMat) return brickMat;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#e8d9c0'; g.fillRect(0, 0, 128, 128);                  // mortar
  for (let r = 0; r < 4; r++) for (let k = -1; k < 3; k++) {
    g.fillStyle = ['#d9733a', '#c8642e', '#e0844a'][(r + k + 3) % 3];
    g.fillRect(k * 64 + (r % 2) * 32 + 3, r * 32 + 3, 58, 26);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  brickMat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 });
  return brickMat;
}
// Where Build Block lands: the grid cell just in front of whatever you aim at.
function blockSpot(G, h, ctx, range) {
  const o = eyeOf(h), d = (ctx.aim || dirFrom(h.yaw, h.pitch)).clone().normalize();
  const t = rayWorld(o, d, range, G.colliders);
  const p = o.clone().addScaledVector(d, Math.max(0, t - 0.05));
  const x = cellOf(p.x), z = cellOf(p.z);
  return { x, z, bottom: groundAt(v.set(x, p.y + 0.05, z), 0.05, G.colliders) };
}
// One of Mortar's own blocks: the oldest crumbles once he has too many.
function build(G, h, x, z, bottom, life) {
  const mine = blocksOf(G, h);
  if (bottom > BLOCK.top) return null;
  while (mine.length >= BLOCK.max) dropBlock(G, mine.shift());
  return placeBlock(G, h, x, z, bottom, life, false);
}
function placeBlock(G, h, x, z, bottom, life, fort) {
  if (bottom > BLOCK.top) return null;
  G.blocks ||= [];
  const collider = makeBox(x, z, BLOCK.size, BLOCK.size, BLOCK.h, bottom);
  // anyone standing where it rises gets lifted onto it rather than trapped inside
  for (const u of [...G.heroes, ...G.minions]) {
    if (!u.alive || !u.vel) continue;
    const r = u.radius || 0.45;
    if (Math.abs(u.pos.x - x) > BLOCK.size / 2 + r * 0.7 || Math.abs(u.pos.z - z) > BLOCK.size / 2 + r * 0.7) continue;
    if (u.pos.y < collider.top && u.pos.y + 1.8 > bottom) { u.pos.y = collider.top; if (u.vel.y < 0) u.vel.y = 0; }
  }
  G.colliders.push(collider);
  const g = new THREE.Group(); g.position.set(x, bottom, z);
  const m = new THREE.Mesh(BLOCK_GEO, brickMaterial()); m.position.y = BLOCK.h / 2; m.castShadow = m.receiveShadow = true; g.add(m);
  const cap = new THREE.Mesh(CAP_GEO, capMats[h.team] ||= new THREE.MeshStandardMaterial({ color: TEAM_COLOR[h.team], roughness: 0.5 }));
  cap.position.y = BLOCK.h + 0.03; cap.receiveShadow = true; g.add(cap);
  g.scale.y = 0.02; G.scene.add(g);
  const b = { owner: h, collider, g, life, t: 0, fort };
  G.blocks.push(b);
  burst(G, new THREE.Vector3(x, bottom + 0.3, z), 0xd9733a, 0.8);
  return b;
}
function dropBlock(G, b) {
  b.collider.alive = false;
  const i = G.colliders.indexOf(b.collider); if (i >= 0) G.colliders.splice(i, 1);
  G.scene.remove(b.g);
  const k = G.blocks.indexOf(b); if (k >= 0) G.blocks.splice(k, 1);
  burst(G, new THREE.Vector3(b.g.position.x, b.collider.bottom + 0.6, b.g.position.z), 0xc8642e, 1);
}
function tickBlocks(G, dt) {
  const list = G.blocks; if (!list) return;
  for (let i = list.length - 1; i >= 0; i--) {
    const b = list[i]; b.life -= dt; b.t += dt;
    b.g.scale.y = Math.max(0.02, Math.min(1, b.t * 7) * Math.min(1, Math.max(0, b.life) * 3));
    if (b.life <= 0 || !b.owner) dropBlock(G, b);
  }
}

// ---------- Crook's Counting Sheep ----------
// A fluffy sheep wraps around each victim and follows them until the spell wears off.
const WOOL = new THREE.MeshStandardMaterial({ color: 0xf6f2ea, roughness: 1 }), SHEEP_FACE = new THREE.MeshStandardMaterial({ color: 0x2a2a32, roughness: 0.7 });
const WOOL_GEO = new THREE.SphereGeometry(0.42, 12, 10), LEG_GEO = new THREE.CylinderGeometry(0.07, 0.07, 0.5, 6);
function sheepMesh() {
  const g = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2, m = new THREE.Mesh(WOOL_GEO, WOOL);
    m.position.set(Math.cos(a) * 0.38, 0.95 + Math.sin(i * 2.3) * 0.2, Math.sin(a) * 0.5); m.castShadow = true; g.add(m);
  }
  const top = new THREE.Mesh(WOOL_GEO, WOOL); top.position.set(0, 1.35, 0); top.scale.setScalar(1.2); g.add(top);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), SHEEP_FACE); head.position.set(0, 1.2, -0.75); head.scale.set(0.9, 1, 1.25); g.add(head);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), SHEEP_FACE); ear.position.set(s * 0.24, 1.32, -0.7); ear.scale.set(1.6, 0.6, 0.8); g.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })); eye.position.set(s * 0.1, 1.27, -0.97); g.add(eye);
  }
  for (const [x, z] of [[-0.25, -0.35], [0.25, -0.35], [-0.25, 0.35], [0.25, 0.35]]) { const l = new THREE.Mesh(LEG_GEO, SHEEP_FACE); l.position.set(x, 0.25, z); g.add(l); }
  return g;
}
function sheepify(G, u, dur) {
  G.sheep ||= [];
  const old = G.sheep.find(s => s.u === u);
  if (old) { old.life = Math.max(old.life, dur); return; }
  const g = sheepMesh(); G.scene.add(g);
  G.sheep.push({ u, g, life: dur, t: 0 });
  burst(G, chestOf(u), 0xffffff, 1.4);
}
function tickSheep(G, dt) {
  const list = G.sheep; if (!list) return;
  for (let i = list.length - 1; i >= 0; i--) {
    const s = list[i]; s.life -= dt; s.t += dt;
    s.g.position.copy(s.u.pos); s.g.rotation.y = s.u.yaw || 0;
    s.g.scale.setScalar(Math.min(1, s.t * 6) * (1 + Math.sin(s.t * 9) * 0.03));
    if (s.life <= 0 || !s.u.alive) { G.scene.remove(s.g); burst(G, chestOf(s.u), 0xffffff, 1); list.splice(i, 1); }
  }
}
