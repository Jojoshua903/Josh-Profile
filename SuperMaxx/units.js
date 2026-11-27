import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { TUNING, HILL, CART } from './data.js?v=20261128w';
import { buildHeroModel } from './models.js?v=20261128w';
import { makeBox, moveBody, resolveXZ, rayBox, raySphere, rayWorld, hasLOS } from './world.js?v=20261128w';
import { resetStatus, tickStatus, afterMove, wallClimb, takenMult, fireMult, canAct, breakInvis, isHidden, slow as applySlow, stun as applyStun, knock as applyKnock, dropBlobs,
  dealtMult, onDealt, onHurt, onKill, mend, thaw } from './abilities.js?v=20261128w';
import { poseHero, rubble } from './anim.js?v=20261128w';
import { onEliminated, survivorPreMove, survivorPostMove } from './survivor.js?v=20261128w';
import { tickVfx, tickLight, blast, sparks } from './vfx.js?v=20261128w';

// Survivor teams are per-hero ids; anything that isn't blue reads as an enemy red.
export const TEAM_COLOR = new Proxy({ blue: 0x2f5bff, red: 0xff5a36 }, { get: (t, k) => (k in t ? t[k] : 0xff5a36) });
const INK = 0x1d2340;
const tmpQ = new THREE.Quaternion();

function lambert(c, o = {}) { return new THREE.MeshStandardMaterial({ color: c, ...o }); }

export function makeBar(width, y) {
  const g = new THREE.Group();
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(width + 0.08, 0.2), new THREE.MeshBasicMaterial({ color: INK }));
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(width, 0.12), new THREE.MeshBasicMaterial({ color: 0x3ccf9a }));
  fill.position.z = 0.01;
  g.add(bg, fill); g.position.y = y;
  g.userData = { fill, width };
  return g;
}
export function setBar(unit, color) {
  const { fill, width } = unit.bar.userData;
  const f = Math.max(0.001, unit.hp / unit.maxHp);
  fill.scale.x = f; fill.position.x = -(width * (1 - f)) / 2;
  if (color) fill.material.color.setHex(color);
}

// ---------- heroes ----------
export function createHero(G, def, team, name, isPlayer) {
  const model = buildHeroModel(def, TEAM_COLOR[team]);
  const mesh = model.root;
  mesh.rotation.order = 'YXZ';
  const bar = makeBar(1.1, 2.45);
  mesh.add(bar);
  if (isPlayer) mesh.visible = false;
  G.scene.add(mesh);

  const h = {
    kind: 'hero', def, team, name, isPlayer, mesh, bar, model, shield: model.shield, gun: model.gun, anim: model.anim,
    pos: new THREE.Vector3(), vel: new THREE.Vector3(), radius: TUNING.radius,
    yaw: team === 'blue' ? Math.PI : 0, pitch: 0, onGround: false,
    hp: def.hp, maxHp: def.hp, alive: true, respawnT: 0, ult: 0,
    ammo: def.weapon.mag, reloadT: 0, fireT: 0,
    kills: 0, deaths: 0, assists: 0, dmgDealt: 0, lastHurtT: -99, lastHitBy: null,
  };
  spawnHero(G, h);
  G.heroes.push(h);
  return h;
}

export function spawnHero(G, h) {
  const s = h.team === 'blue' ? -1 : 1;
  h.pos.set((Math.random() - 0.5) * 8, 0, s * (G.map.L - 4) + (Math.random() - 0.5) * 3);
  // duels start face to face partway down the map; red is the point mirror of blue
  if (G.mode === 'duel' && G.map.duel) { const [x, z] = G.map.duel; const sp = G.heroes.filter(u => u.team === h.team).length > 1 ? 7 : 2; h.pos.set(-s * x + (Math.random() - 0.5) * sp, 0, -s * z + (Math.random() - 0.5) * 2); }
  h.vel.set(0, 0, 0);
  h.hp = h.maxHp; h.alive = true; h.ammo = h.def.weapon.mag; h.reloadT = 0;
  resetStatus(h);
  h.spawnA = 1; h.deathT = 0; h.castA = 0; h.chargeStart = null; h.bleedT = 0; h.frost = 0; h.ramp = 0;
  h.mesh.rotation.set(0, 0, 0); h.mesh.scale.setScalar(1);
  h.yaw = h.team === 'blue' ? Math.PI : 0; h.pitch = 0;
  if (h.dummyAt) h.pos.set(h.dummyAt.x, 0, h.dummyAt.z);               // tutorial training dummies
  if (h.spawnAt) { const p = h.spawnAt(); h.pos.set(p.x, 0, p.z); }   // Story missions pick their own spots
  h.mesh.visible = !h.isPlayer;
  setBar(h, h.team === G.playerTeam ? 0x3ccf9a : TEAM_COLOR[h.team]);
  if (G.mode === 'hill' || G.mode === 'cart') { const s = HILL.spawnHaste; h.hasteT = s.dur; h.hasteSpeed = s.speed; h.hasteFire = 1; }  // sprint back to the ring
}

export const eyeOf = (u, out = new THREE.Vector3()) => out.set(u.pos.x, u.pos.y + TUNING.eye, u.pos.z);
export const chestOf = (u, out = new THREE.Vector3()) =>
  out.set(u.pos.x, u.pos.y + (u.kind === 'hero' ? 1.1 : u.kind === 'minion' ? 0.5 : u.height * 0.5), u.pos.z);

export function dirFrom(yaw, pitch, out = new THREE.Vector3()) {
  return out.set(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
}

// ---------- structures ----------
export function createStructure(G, type, team, x, z) {
  const mesh = new THREE.Group();
  const tc = TEAM_COLOR[team];
  let height, rad, hp;
  if (type === 'tower') {
    height = 5.2; rad = 1.3; hp = TUNING.towerHp;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.6, 4, 8), lambert(0xf7f0e2));
    base.position.y = 2; base.castShadow = true;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1.33, 1.33, 0.5, 8), lambert(tc));
    band.position.y = 3.2;
    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 0), lambert(tc, { emissive: tc, emissiveIntensity: 0.5 }));
    orb.position.y = 4.8; orb.name = 'orb';
    mesh.add(base, band, orb);
  } else {
    height = 6; rad = 2.4; hp = TUNING.coreHp;
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.2, 1.4, 10), lambert(0xf7f0e2));
    ped.position.y = 0.7; ped.castShadow = true;
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(1.9, 0), lambert(tc, { emissive: tc, emissiveIntensity: 0.35, flatShading: true }));
    gem.position.y = 3.6; gem.name = 'orb'; gem.castShadow = true;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.12, 8, 40), lambert(INK));
    ring.rotation.x = Math.PI / 2; ring.position.y = 3.6; ring.name = 'ring';
    mesh.add(ped, gem, ring);
  }
  const bar = makeBar(type === 'tower' ? 2.4 : 3.6, height + 1);
  mesh.add(bar);
  mesh.position.set(x, 0, z);
  G.scene.add(mesh);
  const s = {
    kind: type, team, mesh, bar, pos: new THREE.Vector3(x, 0, z), height, rad,
    hp, maxHp: hp, alive: true, atkT: 0,
  };
  s.collider = makeBox(x, z, rad * 1.7, rad * 1.7, type === 'tower' ? 4 : 1.4);
  s.hitbox = makeBox(x, z, rad * 1.7, rad * 1.7, height);
  s.key = 's' + G.structures.length;                                   // online: same build order on every machine, so the index names it
  s.collider.unit = s;
  G.colliders.push(s.collider);
  setBar(s, tc);
  G.structures.push(s);
  return s;
}

export function coreVulnerable(G, team) {
  return (G.mode === 'lane' && G.time > TUNING.overtime) || G.structures.some(s => s.kind === 'tower' && s.team === team && !s.alive);
}

// ---------- minions ----------
// `id` is given when an online guest mirrors one of the host's minions; otherwise the next number.
export function spawnMinion(G, team, laneIdx, offset, id) {
  const tc = TEAM_COLOR[team];
  const mesh = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), lambert(tc));
  body.position.y = 0.5; body.castShadow = true;
  const eye = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.1), lambert(0xfff3e0));
  eye.position.set(0, 0.6, -0.36);
  mesh.add(body, eye);
  const bar = makeBar(0.7, 1.25);
  mesh.add(bar);
  G.scene.add(mesh);
  const lane = G.map.lanes[laneIdx];
  const path = team === 'blue' ? lane : [...lane].reverse();
  // start a few metres in front of the core, along the lane
  const [ax, az] = path[0], [bx, bz] = path[1];
  const l = Math.hypot(bx - ax, bz - az);
  const sx = ax + (bx - ax) / l * 5.5, sz = az + (bz - az) / l * 5.5;
  const m = {
    kind: 'minion', team, mesh, bar, body, path, wp: 1,
    pos: new THREE.Vector3(sx + offset * (bz - az) / l, 0, sz - offset * (bx - ax) / l), vel: new THREE.Vector3(), radius: 0.4,
    hp: TUNING.minionHp, maxHp: TUNING.minionHp, alive: true, atkT: Math.random(), bob: Math.random() * 6,
    lane: laneIdx, id: id ?? (G.mid = (G.mid || 0) + 1),
  };
  m.key = 'm' + m.id;
  setBar(m, tc);
  G.minions.push(m);
  return m;
}

// Online Lane Breaker: the host runs the minions, towers and cores. Guests see them as puppets
// and send their hits on them to the host, like hits on heroes go to the hero's owner.
const laneUnit = u => (u.kind === 'minion' && !u.deploy) || u.kind === 'tower' || u.kind === 'core';
// A guest's copy of a unit the host reports as destroyed: same crumble, no credit.
export function unitDown(G, t) { if (t.alive) { t.hp = 0; kill(G, t, null); } }

// ---------- combat ----------
export function trace(G, o, d, maxT, team) {
  let best = rayWorld(o, d, maxT, G.colliders), hit = null, head = false;
  const c = new THREE.Vector3();
  for (const h of G.heroes) {
    if (!h.alive || h.team === team) continue;
    let t = raySphere(o, d, c.set(h.pos.x, h.pos.y + 1.62, h.pos.z), 0.3, best);
    if (t < best) { best = t; hit = h; head = true; }
    for (const y of [0.55, 1.15]) {
      t = raySphere(o, d, c.set(h.pos.x, h.pos.y + y, h.pos.z), 0.46, best);
      if (t < best) { best = t; hit = h; head = false; }
    }
  }
  for (const m of G.minions) {
    if (!m.alive || m.team === team) continue;
    const t = raySphere(o, d, c.set(m.pos.x, m.pos.y + (m.hitY || 0.5), m.pos.z), m.hitR || 0.5, best);
    if (t < best) { best = t; hit = m; head = false; }
  }
  for (const s of G.structures) {
    if (!s.alive || s.team === team) continue;
    const t = rayBox(o, d, s.hitbox, best);
    if (t < best) { best = t; hit = s; head = false; }
  }
  return { t: best, unit: hit, head, point: o.clone().addScaledVector(d, best) };
}

// `dot` marks burn and bleed ticks, which never trigger on-hit passives.
// small per-match counts on a hero for the recruitment contracts (contracts.js)
export const tally = (h, k, n = 1) => { if (h?.kind === "hero") (h.cs ||= {})[k] = (h.cs[k] || 0) + n; };
export function damage(G, target, amt, src, head = false, force = false, dot = false) {
  if (!target.alive) return;
  if (src && !dot && !force) amt *= dealtMult(src, target);           // reported hits already include it
  // online: damage counts on the attacker's machine and is reported to the target's owner;
  // `force` marks damage the owner applies itself (reported hits, bleeds)
  if (G.net && target.kind === 'hero' && !force) {
    if (!target.local) {
      if (src && src.kind === 'hero' && src.local && src.team !== target.team) {
        G.net.hit(target, amt, src, head);
        src.dmgDealt += amt;
        src.ult = Math.min(100, src.ult + amt / src.def.ult.cost * 100);
        target.flinchA = Math.min(1, (target.flinchA || 0) + amt / 40);
        G.ev.damage(target, amt, src, head);
        if (!dot) onDealt(G, src, target, amt, head, true);
      } else if (src && G.net.host && laneUnit(src)) G.net.hit(target, amt, src, false);   // the host's minions and towers hit guests too
      return;
    }
    if (src && src.kind === 'hero' && !src.local) return;
  }
  if (G.net && laneUnit(target) && !force) {
    if (!G.net.host) {
      if (src && src.kind === 'hero' && src.local && src.team !== target.team) {
        if (target.kind === 'core' && !coreVulnerable(G, target.team)) { G.ev.immune(target, src); return; }
        G.net.hit(target, amt, src, head);
        src.dmgDealt += amt;
        src.ult = Math.min(100, src.ult + amt / src.def.ult.cost * 100 * 0.45);
        G.ev.damage(target, amt, src, head);
      }
      return;
    }
    if (src && src.kind === 'hero' && !src.local) return;                 // that guest reports the hit itself
  }
  if (target.kind === 'core' && !coreVulnerable(G, target.team)) { G.ev.immune(target, src); return; }
  if (target.kind === 'core' && G.mode === 'lane' && G.time > TUNING.overtime) amt *= 2;   // overtime
  if (src && src.power) amt *= 1 + 0.15 * src.power;                        // Survivor power-ups
  if (src && src.rallyT > 0) amt *= src.rallyAmp;                           // Cavalier's banner
  if (target.kind === 'hero') { amt *= takenMult(target); target.flinchA = Math.min(1, (target.flinchA || 0) + amt / 40); }
  if (target.armor > 0) { const a = Math.min(target.armor, amt); target.armor -= a; amt -= a; G.ev.armorHit?.(target, a); if (amt <= 0) { G.ev.damage(target, a, src, head); return; } }
  if (target.frozenT > 0 && amt > 1 && src !== target) { amt *= target.shatterM || 1.5; thaw(G, target, true); if (target.kind === 'hero') G.ev.flash?.(target, 'Shattered!'); }   // Avalanche: frozen enemies shatter
  // Sir Pixel's 1-UP: the hit that would knock you out leaves you at half health instead
  if (target.oneUpT > 0 && target.hp - amt <= 0) { amt = 0; target.oneUpT = 0; target.hp = Math.max(target.hp, target.maxHp * 0.5); target.barrierT = Math.max(target.barrierT, 1); target.barrierM = 0.2; setBar(target); burst(G, chestOf(target), 0x39ff6a, 1.8); G.ev.flash?.(target, '1-UP!'); }
  if (target.vigilT > 0 && target.hp - amt < 1) { amt = Math.max(0, target.hp - 1); if (G.time > (target.vigilFx || 0)) { target.vigilFx = G.time + 0.4; burst(G, chestOf(target), 0xffe08a, 1); } }   // Lantern's Vigil: hold on at 1 health
  target.hp -= amt;
  if (src && src.kind === 'hero' && src.team !== target.team) {
    src.dmgDealt += amt;
    if (target.kind === "hero") {
      (target.hitLog ||= new Map()).set(src, G.time);                       // enemy outlines
      const e = (target.dmgLog ||= new Map()).get(src);                     // assists: how much each attacker has done lately
      if (e && G.time - e.t <= ASSIST.dmg) { e.d += amt; e.t = G.time; } else target.dmgLog.set(src, { d: amt, t: G.time });
    }
    src.ult = Math.min(100, src.ult + amt / src.def.ult.cost * 100 * (target.kind === 'hero' ? 1 : 0.45));
    if (head && target.kind === "hero") tally(src, "heads");
  }
  if (target.kind === 'hero') { target.lastHurtT = G.time; target.lastHitBy = src; }
  if (src && !dot) onDealt(G, src, target, amt, head, false);
  if (target.kind === 'hero' && onHurt(G, target)) { G.ev.damage(target, amt, src, head); setBar(target); return; }
  G.ev.damage(target, amt, src, head);
  if (target.hp <= 0) { target.killedByHead = head; kill(G, target, src); }
  else setBar(target);
}

// Assists: anyone other than the killer who did at least 45% of the damage the victim took in
// the last 8s (counting the killer's). Each machine works these out for itself online.
const ASSIST = { dmg: 8, share: 0.45 };
function assistsOn(G, t, src) {
  const recent = [...(t.dmgLog || [])].filter(([h, e]) => h.team !== t.team && G.time - e.t <= ASSIST.dmg);
  const total = recent.reduce((s, [, e]) => s + e.d, 0);
  const list = total > 0 ? recent.filter(([h, e]) => h !== src && h !== t && e.d / total >= ASSIST.share).map(([h]) => h) : [];
  t.hitLog?.clear(); t.dmgLog?.clear();
  for (const h of list) h.assists = (h.assists || 0) + 1;
  return list;
}

function kill(G, t, src) {
  t.alive = false; t.hp = 0;
  burst(G, chestOf(t), TEAM_COLOR[t.team], t.kind === 'minion' ? 1 : 2.2);
  if (t.kind === 'hero') {
    t.deaths++; t.respawnT = G.mode === 'hill' ? HILL.respawn : G.mode === 'cart' || G.mode === 'potato' || G.mode === 'ball' ? CART.respawn : G.mode === 'duel' ? Infinity : TUNING.respawn; t.deathT = 0;      // the model plays its fall, then hides
    if (G.mode === 'survivor') onEliminated(G, t);
    if (t.isPlayer) t.mesh.visible = false;
    if (t.shimmer) t.shimmer.visible = false;
    if (src && src.kind === 'hero') {
      src.kills++; G.score[src.team]++;
      if (!src.onGround) tally(src, "air");
      if (!src.isPlayer && src.onGround) { src.vel.y = 6; src.castA = 1; }  // victory hop
    }
    else G.score[t.team === 'blue' ? 'red' : 'blue']++;
  } else if (t.kind === 'minion') {
    G.scene.remove(t.mesh);
  } else {
    t.collider.alive = false;
    t.mesh.traverse(o => { if (o.name === 'orb' || o.name === 'ring') o.visible = false; });
    t.bar.visible = false;
    t.collapseT = 1;
    rubble(G, t.pos, TEAM_COLOR[t.team], t.kind === 'core' ? 26 : 14);
    if (t.kind === "tower" || t.kind === "core") tally(src, "towers");
  }
  if (t.kind === 'hero' && t.def.passive?.id === 'slimedrop') dropBlobs(G, t, t.def.passive);
  t.assisters = t.kind === "hero" ? assistsOn(G, t, src) : [];
  onKill(G, t, src);
  G.ev.kill(t, src);
  if (G.net && t.kind === 'hero' && t.local) G.net.kill(t, src);
}

// Online: someone else's hero died on their machine.
export function remoteKill(G, t, src, head) {
  if (!t.alive) return;
  t.killedByHead = head; t.alive = false; t.hp = 0; t.deathT = 0; t.deadAt = G.time; t.deaths++;
  burst(G, chestOf(t), TEAM_COLOR[t.team], 2.2);
  if (t.shimmer) t.shimmer.visible = false;
  if (src && src.kind === "hero") { src.kills++; if (!src.onGround) tally(src, "air"); }
  G.score[src && src.kind === 'hero' ? src.team : t.team === 'blue' ? 'red' : 'blue']++;
  if (t.def.passive?.id === 'slimedrop') dropBlobs(G, t, t.def.passive);
  t.assisters = assistsOn(G, t, src);
  onKill(G, t, src);
  G.ev.kill(t, src);
}

// Online: replay a remote hero's shot from their model's gun. Damage is ignored locally.
export function netShoot(G, h, dir, charge) {
  h.ammo = h.def.weapon.mag; h.reloadT = 0; h.fireT = 0;
  shoot(G, h, dir, h.gun.getWorldPosition(new THREE.Vector3()), charge, true);
}

export function startReload(h) {
  if (h.reloadT > 0 || h.ammo === h.def.weapon.mag || h.noReloadT > 0) return;
  h.reloadT = h.def.weapon.reload;
}

// Larkspur's arrows: a long thin shaft that points where it flies
const ARROW_GEO = new THREE.CylinderGeometry(0.025, 0.04, 0.9, 6).rotateX(Math.PI / 2);
export function spawnProjectile(G, owner, from, vel, w) {
  const geo = w.arrow ? ARROW_GEO : w.card ? new THREE.BoxGeometry(0.2, 0.02, 0.28)
    : w.box ? new THREE.BoxGeometry(w.size * 1.6, w.size * 1.2, w.size * 1.6) : new THREE.SphereGeometry(w.size || 0.22, 10, 8);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: w.color || 0xff8a3c }));
  mesh.position.copy(from); G.scene.add(mesh);
  G.projectiles.push({ owner, team: owner.team, pos: from.clone(), vel, w, mesh, life: 4, trailT: 0, trav: 0 });
}

// ---------- weapons ----------
// Every hero's primary has its own mode: burst, ramp, cluster, charge, thorns, chain, homing, cone.
const UP = new THREE.Vector3(0, 1, 0);
const flat = d => new THREE.Vector3(d.x, 0, d.z).normalize();
const v3 = new THREE.Vector3();

export function fire(G, h, dir, muzzle) {
  const w = h.def.weapon;
  if (!h.alive || h.reloadT > 0 || h.fireT > 0 || !canAct(h)) return false;
  if (h.ammo <= 0) { startReload(h); return false; }
  if (w.mode === 'charge') {                      // holding only charges; releaseFire() shoots
    if (h.chargeStart == null) h.chargeStart = G.time;
    return false;
  }
  return shoot(G, h, dir, muzzle, 1);
}
export const chargeLevel = (G, h) => h.chargeStart == null ? 0 : Math.min(1, (G.time - h.chargeStart) / h.def.weapon.chargeTime);
export function releaseFire(G, h, dir, muzzle) {
  if (h.chargeStart == null) return false;
  const c = chargeLevel(G, h); h.chargeStart = null;
  if (!h.alive || !canAct(h) || h.reloadT > 0 || h.ammo <= 0) return false;
  return shoot(G, h, dir, muzzle, Math.max(0.05, c));
}


// Prism's rainbow: what each colour does when it lands
export const PRISM = [
  { name: 'Red', color: 0xff4d4d, dmg: 1.4 }, { name: 'Orange', color: 0xff9a3c }, { name: 'Yellow', color: 0xffe14a },
  { name: 'Green', color: 0x5fe07a }, { name: 'Blue', color: 0x4d9aff }, { name: 'Violet', color: 0xb06aff },
];
function prismHit(G, h, u, k, d) {
  const hero = u.kind === 'hero' && u.alive;
  if (k === 1 && hero) { u.burnT = 2.5; u.burnDps = 9; u.burnSrc = h; }                  // orange: burn
  if (k === 2 && hero) applySlow(u, 0.65, 1.2);                                          // yellow: slow
  if (k === 3 && h.alive && h.hp < h.maxHp) { const b = h.hp; h.hp = Math.min(h.maxHp, h.hp + 10); setBar(h); G.ev.heal?.(h, h.hp - b, h); }   // green: heal yourself
  if (k === 4 && (hero || (u.kind === 'minion' && u.alive))) applyKnock(u, flat(d), 6, 2);  // blue: knock back
  if (k === 5 && hero) { u.markT = Math.max(u.markT, 2); u.markAmp = Math.max(u.markAmp || 1, 1.15); }             // violet: mark
}

function shoot(G, h, dir, muzzle, charge, replay = false) {
  const w = h.def.weapon;
  if (G.net && h.local && !replay) G.net.fire(h, dir, charge);
  let rate = w.rate;
  if (w.mode === 'ramp') {
    h.ramp = Math.min(1, (G.time - (h.lastShotT ?? -9) < 0.3 ? (h.ramp || 0) : 0) + 0.06);
    rate = w.rate / (1 + h.ramp * (w.rampMax ?? 2.4));
  }
  h.fireT = rate / fireMult(h); h.lastShotT = G.time;
  G.shotHook?.(G, h, dir, charge);                                      // Smash Ball: shots shove the ball
  const bonus = h.ambush || 1; h.ambush = 1;
  breakInvis(h);
  const o = eyeOf(h);
  const moving = Math.hypot(h.vel.x, h.vel.z) > 1;
  let sp = w.spread * (moving ? 1.6 : 1) * (h.onGround ? 1 : 2.2) * (h.zoomA > 0.5 ? 0.6 : 1);   // zoomed in: 40% tighter
  if (w.mode === 'ramp') sp *= 1 + h.ramp * 0.7;
  const jitter = (d0, s) => { const d = d0.clone(); d.x += (Math.random() - 0.5) * 2 * s; d.y += (Math.random() - 0.5) * 2 * s; d.z += (Math.random() - 0.5) * 2 * s; return d.normalize(); };
  const mz = muzzle || o.clone().addScaledVector(dir, 0.7);
  const spend = () => { if (h.noReloadT <= 0) h.ammo--; };

  if (w.mode === 'burst') {
    for (let i = 0; i < w.burst; i++) {
      const round = () => {
        if (!h.alive || (h.ammo <= 0 && h.noReloadT <= 0)) return;
        spend();
        const eye = eyeOf(h), d = jitter(i ? dirFrom(h.yaw, h.pitch) : dir, sp * (1 + i * 0.35));
        const r = trace(G, eye, d, w.range, h.team);
        tracer(G, i ? eye.clone().addScaledVector(d, 0.7).setY(eye.y - 0.2) : mz, r.point, w.tracer, 0.07);
        if (r.unit) {
          damage(G, r.unit, w.dmg * (r.head ? w.head : 1) * bonus, h, r.head);
          if (i === w.burst - 1) applyKnock(r.unit, flat(d), 4, 1.5);
        } else spark(G, r.point);
        h.recoilA = 1;
        if (i) G.ev.shot(h);
        if (h.ammo <= 0) startReload(h);
      };
      if (i === 0) round(); else G.timers.push({ t: i * w.gap, fn: round });
    }
  } else if (w.mode === 'prism') {                  // Prism: every shot is the next colour of the rainbow
    spend();
    const night = h.nightT > 0, k = h.hue = ((h.hue ?? -1) + 1) % PRISM.length, C = PRISM[k];
    const d = jitter(dir, sp), dmg = w.dmg * bonus * (night ? h.def.ult.dmg : C.dmg || 1);
    let from = o.clone(), left = w.range, end = o.clone().addScaledVector(d, w.range);
    const seen = new Set();
    for (let n = 0; n < (night ? 3 : 1) && left > 0; n++) {           // Nightmare: shots pierce
      const r = trace(G, from, d, left, h.team);
      end = r.point;
      if (!r.unit) { spark(G, r.point); break; }
      if (!seen.has(r.unit)) { seen.add(r.unit); damage(G, r.unit, dmg * (r.head ? w.head : 1), h, r.head); prismHit(G, h, r.unit, night ? 5 : k, d); }
      if (r.unit.kind !== 'hero' && r.unit.kind !== 'minion') break;
      const step = r.t + 1.3; from = from.addScaledVector(d, step); left -= step;
    }
    tracer(G, mz, end, night ? 0x5a2a8a : C.color, 0.1);
    if (night) tracer(G, mz, end, 0xff2a4a, 0.06);
  } else if (w.mode === 'charge') {
    spend();
    const d = dir.clone().normalize();
    const dmg = (w.minDmg + (w.dmg - w.minDmg) * Math.pow(charge, 1.3)) * bonus;
    let from = o.clone(), left = w.range, end = o.clone().addScaledVector(d, w.range), hits = 0;
    const seen = new Set();
    while (left > 0 && hits < (charge > 0.95 ? w.pierce : 1)) {
      const r = trace(G, from, d, left, h.team);
      end = r.point;
      if (!r.unit) { spark(G, r.point); break; }
      if (!seen.has(r.unit)) { seen.add(r.unit); hits++; damage(G, r.unit, dmg * (r.head ? w.head : 1), h, r.head); }
      if (r.unit.kind === 'tower' || r.unit.kind === 'core') break;
      const step = r.t + 1.3; from = from.addScaledVector(d, step); left -= step;
    }
    tracer(G, mz, end, w.tracer, w.tracerLife * (0.5 + charge));
    if (charge > 0.95) {
      tracer(G, mz.clone().add(new THREE.Vector3(0, 0.04, 0)), end, 0xffffff, w.tracerLife);
      for (let k = 1; k < 6; k++) burst(G, mz.clone().lerp(end, k / 6), w.tracer, 0.5);
    }
  } else if (w.mode === 'thorns') {
    spend();
    for (let i = 0; i < w.pellets; i++) {
      const r = trace(G, o, jitter(dir, w.spread), w.range, h.team);
      tracer(G, mz, r.point, w.tracer, 0.09);
      if (r.unit) {
        damage(G, r.unit, w.dmg * (r.head ? w.head : 1) * bonus, h, r.head);
        if (w.bleed && r.unit.kind === 'hero' && r.unit.alive) { r.unit.bleedT = w.bleed.dur; r.unit.bleedDps = w.bleed.dps; r.unit.bleedSrc = h; }
      } else if (i < 3) spark(G, r.point);
    }
  } else if (w.mode === 'cone') {
    spend();
    const d = dir.clone().normalize();
    for (const u of [...G.heroes, ...G.minions, ...G.structures]) {
      if (!u.alive || u.team === h.team) continue;
      const c = chestOf(u), to = c.clone().sub(o), dist = to.length();
      if (dist > w.range + (u.rad || 0) || to.normalize().dot(d) < w.cone || !hasLOS(o, c, G.colliders)) continue;
      damage(G, u, w.dmg * bonus, h, false);
      if (u.kind === 'hero' && u.alive) {
        applySlow(u, w.slow.mult, w.slow.dur);
        u.frost = (u.frost || 0) + w.rate;
        if (u.frost >= w.freeze) { u.frost = 0; applyStun(u, 1); burst(G, c, 0xcdeeff, 1.6); G.ev.flash?.(u, 'Frozen'); }
      }
    }
    for (let k = 0; k < 3; k++) {                  // snow puffs
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.09 + Math.random() * 0.08, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }));
      m.position.copy(mz); G.scene.add(m);
      const v = jitter(d, 0.22).multiplyScalar(13 + Math.random() * 5); v.y += 2.5;
      G.fx.push({ obj: m, life: 0.55, max: 0.55, kind: 'debris', vel: v, spin: 0 });
    }
  } else if (w.mode === 'homing') {
    spend();
    for (let k = 0; k < w.fan; k++) {
      const d = jitter(dir, sp).applyAxisAngle(UP, (k - (w.fan - 1) / 2) * w.fanAngle);
      spawnProjectile(G, h, mz.clone(), d.multiplyScalar(w.speed), { ...w, dmg: w.dmg * bonus, trail: true, maxRange: w.range });
    }
  } else if (w.mode === 'beam') {                   // sound beam: steady ticks, every fourth one is the bass hit
    spend();
    h.beat = ((h.beat || 0) + 1) % 4;
    const big = h.beat === 0;
    const r = trace(G, o, dir, w.range, h.team);
    tracer(G, mz, r.point, big ? 0xff4fa3 : w.tracer, big ? 0.14 : 0.07);
    if (big) tracer(G, mz.clone().add(new THREE.Vector3(0, 0.035, 0)), r.point, 0xffffff, 0.1);
    if (r.unit) {
      damage(G, r.unit, w.dmg * (big ? w.beatMult : 1) * (r.head ? w.head : 1) * bonus, h, r.head);
      if (big) burst(G, r.point, 0xff4fa3, 0.55);
    } else if (big) spark(G, r.point);
  } else if (w.mode === 'quill') {                  // Hoot's quills: two per shot, sharper from the air
    spend();
    const air = h.onGround ? 1 : 1 + w.aerial;
    for (let i = 0; i < w.quills; i++) {
      const r = trace(G, o, jitter(dir, sp + i * 0.004), w.range, h.team);
      tracer(G, mz, r.point, air > 1 ? 0xffe08a : w.tracer, 0.08);
      if (r.unit) damage(G, r.unit, w.dmg * air * (r.head ? w.head : 1) * bonus, h, r.head);
      else spark(G, r.point);
    }
  } else if (w.mode === 'carbine') {                // lever carbine: hits harder at a full gallop
    spend();
    const gal = Math.min(1, Math.hypot(h.vel.x, h.vel.z) / (h.def.speed || 8));
    const r = trace(G, o, jitter(dir, sp * 0.7), w.range, h.team);
    tracer(G, mz, r.point, w.tracer, 0.09);
    if (r.unit) {
      damage(G, r.unit, w.dmg * (1 + w.gallop * gal) * (r.head ? w.head : 1) * bonus, h, r.head);
      if (gal > 0.8) burst(G, r.point, w.tracer, 0.4);
    } else spark(G, r.point);
  } else if (w.mode === 'magnet') {                 // Lodestar: bolts magnetise what they hit and tug enemies toward her
    spend();
    const r = trace(G, o, jitter(dir, sp), w.range, h.team);
    tracer(G, mz, r.point, w.tracer, 0.08); tracer(G, mz, r.point, 0x7ab0ff, 0.05);
    if (r.unit) {
      damage(G, r.unit, w.dmg * (r.head ? w.head : 1) * bonus, h, r.head);
      const u = r.unit;
      if ((u.kind === 'hero' || u.kind === 'minion') && u.alive && u.team !== h.team) {
        if (u.kind === "hero") { u.magT = h.def.passive.dur; u.magBy = h; }
        const dx = h.pos.x - u.pos.x, dz = h.pos.z - u.pos.z, d = Math.hypot(dx, dz);
        if (d > 2.5 && !(u.kind === 'hero' && u.def.passive?.id === 'ballast')) { u.pos.x += dx / d * w.tug; u.pos.z += dz / d * w.tug; resolveXZ(u.pos, u.radius || 0.5, G.colliders); }
        if (Math.random() < 0.4) burst(G, r.point, 0x7ab0ff, 0.25);
      }
    } else spark(G, r.point);
  } else if (w.mode === 'ribbon') {                 // Pirouette's ribbon: one sweep cuts enemies and heals friends
    spend();
    const d = dir.clone().normalize(), side = new THREE.Vector3(-d.z, 0, d.x), flip = (h.sweep = -(h.sweep || 1));
    for (const u of [...G.heroes, ...G.minions, ...G.structures]) {
      if (!u.alive || u === h) continue;
      const c = chestOf(u), to = c.clone().sub(o), dist = to.length();
      if (dist > w.range + (u.rad || 0) || to.normalize().dot(d) < w.cone || !hasLOS(o, c, G.colliders)) continue;
      if (u.team !== h.team) { damage(G, u, w.dmg * bonus, h, false); burst(G, c, w.tracer, 0.35); }
      else if (u.kind === 'hero' && u.hp < u.maxHp) { const b = u.hp; u.hp = Math.min(u.maxHp, u.hp + w.heal); setBar(u); G.ev.heal?.(u, u.hp - b, h); burst(G, c, 0xfff0f6, 0.3); }
    }
    // the ribbon itself: a curling arc that swings left, then right
    let prev = mz.clone();
    for (let k = 1; k <= 8; k++) {
      const t = k / 8, a = mz.clone().addScaledVector(d, t * w.range * 0.8).addScaledVector(side, flip * Math.sin(t * Math.PI) * 1.6).setY(o.y - 0.3 + Math.sin(t * Math.PI * 2) * 0.35);
      tracer(G, prev, a, k % 2 ? w.tracer : 0xffffff, 0.18); prev = a;
    }
  } else if (w.mode === 'mend') {                   // Stitch's darts and Dynamo's cables: hurt enemies, help teammates
    spend();
    const d = jitter(dir, sp), r = trace(G, o, d, w.range, h.team);
    let pal = null, best = r.t;
    for (const u of G.heroes) {                     // teammates have bigger hitboxes, so helping is forgiving
      if (!u.alive || u === h || u.team !== h.team) continue;
      for (const [y, rad] of [[0.55, 0.55], [1.15, 0.55], [1.62, 0.38]]) { const t = raySphere(o, d, v3.set(u.pos.x, u.pos.y + y, u.pos.z), rad, best); if (t < best) { best = t; pal = u; } }
    }
    const end = pal ? o.clone().addScaledVector(d, best) : r.point, col = pal ? w.ally : w.tracer;
    if (w.zap) {                                    // a crackling bolt rather than a straight line
      let prev = mz.clone();
      for (let k = 1; k <= 4; k++) { const p = mz.clone().lerp(end, k / 4); if (k < 4) p.add(new THREE.Vector3((Math.random() - 0.5) * 0.35, (Math.random() - 0.5) * 0.35, (Math.random() - 0.5) * 0.35)); tracer(G, prev, p, k % 2 ? col : 0xffffff, 0.08); prev = p; }
    } else tracer(G, mz, end, col, 0.1);
    if (pal) { mend(G, h, pal, w.heal || 0, w.boost || 0); burst(G, end, w.ally, 0.4); }
    else if (r.unit) damage(G, r.unit, w.dmg * (r.head ? w.head : 1) * bonus, h, r.head);
    else spark(G, r.point);
  } else if (w.mode === 'melee') {                  // Torque's glove: momentum turns a jab into a haymaker
    const m = h.momentum || 0, mult = 1 + w.momentum * m / 100, d = dir.clone().normalize();
    let hits = 0;
    for (const u of [...G.heroes, ...G.minions, ...G.structures]) {
      if (!u.alive || u.team === h.team) continue;
      const c = chestOf(u), to = c.clone().sub(o), dist = to.length();
      if (dist > w.range + (u.rad || 0) || to.normalize().dot(d) < w.cone) continue;
      damage(G, u, w.dmg * mult * bonus, h, false);
      if (u.kind === 'hero' || u.kind === 'minion') applyKnock(u, flat(d), 3 + w.knock * m / 100, 2 + 5 * m / 100);
      burst(G, c, m > 80 ? 0xffd23c : 0xffffff, 0.5 + m / 100);
      hits++;
    }
    // the swing: a quick arc in front, brighter with momentum
    const side = new THREE.Vector3(-d.z, 0, d.x);
    for (let k = 0; k < 5; k++) {
      const a = mz.clone().addScaledVector(d, 1.2).addScaledVector(side, (k - 2) * 0.35).setY(o.y - 0.3 + Math.abs(k - 2) * 0.08);
      tracer(G, mz, a, m > 80 ? 0xffd23c : w.tracer, 0.08);
    }
    if (hits) { if (!(h.overdriveT > 0)) h.momentum = m * 0.15; G.ev.shake?.(h, 0.15 + m / 250); }
  } else {                                          // cluster, chain and plain projectiles
    spend();
    spawnProjectile(G, h, mz, jitter(dir, sp).multiplyScalar(w.speed), { ...w, dmg: w.dmg * bonus, trail: true, maxRange: w.range });
  }
  h.recoilA = w.mode === 'charge' ? 0.6 + charge : 1;
  if (h.ammo <= 0) startReload(h);
  G.ev.shot(h, charge);
  return true;
}

function explode(G, p, owner, w, direct) {
  if (direct && !w.noDirect && (!w.splash || w.splash <= 0)) {
    damage(G, direct.unit, w.dmg * (direct.head ? (w.head || 1) : 1), owner, direct.head);
    if (w.slow) applySlow(direct.unit, w.slow.mult, w.slow.dur);
    burst(G, p, w.color || 0xffb070, 0.35);
    if (w.chain) {                                  // rivets arc to nearby enemies
      const from = chestOf(direct.unit);
      const near = [...G.heroes, ...G.minions].filter(u => u.alive && u !== direct.unit && u.team !== owner.team && u.pos.distanceTo(direct.unit.pos) < w.chain.range)
        .sort((a, b) => a.pos.distanceTo(direct.unit.pos) - b.pos.distanceTo(direct.unit.pos)).slice(0, w.chain.n);
      for (const u of near) {
        const to = chestOf(u), mid = from.clone().lerp(to, 0.5).add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 0.5, (Math.random() - 0.5) * 0.8));
        tracer(G, from, mid, 0x7af0ff, 0.15); tracer(G, mid, to, 0x7af0ff, 0.15);
        damage(G, u, w.dmg * w.chain.mult, owner, false);
      }
    }
  }
  if (w.splash > 0) {
    burst(G, p, w.color || 0xff8a3c, w.splash * 0.9);
    if (w.big) burst(G, p, 0xffffff, w.splash * 0.4);
    if (!w.child) blast(G, p, w.color || 0xff8a3c, w.splash);
    for (const u of [...G.heroes, ...G.minions, ...G.structures]) {
      if (!u.alive || u.team === owner.team) continue;
      const c = chestOf(u);
      const d = c.distanceTo(p) - (u.rad || 0);
      if (d < w.splash) {
        damage(G, u, w.dmg * (1 - 0.5 * Math.max(0, d) / w.splash), owner, false);
        if (w.slow) applySlow(u, w.slow.mult, w.slow.dur);
      }
    }
  }
  if (w.heal && w.splash > 0) {                       // Beef Wellington's gravy: teammates in the splash get a hot top-up
    for (const u of G.heroes) if (u.alive && u !== owner && u.team === owner.team && chestOf(u).distanceTo(p) < w.splash + 0.6) { mend(G, owner, u, w.heal); burst(G, chestOf(u), 0xffd27a, 0.5); }
  }
  if (w.mode === 'cluster' && !w.child) {           // firework shell pops into sparklers
    const cols = [0xff4fa3, 0xffd23c, 0x7af0ff];
    for (let k = 0; k < 3; k++) {
      const a = k / 3 * Math.PI * 2 + Math.random();
      spawnProjectile(G, owner, p.clone().setY(p.y + 0.4), new THREE.Vector3(Math.cos(a) * 6, 7, Math.sin(a) * 6),
        { dmg: 15, splash: 2.2, grav: 22, color: cols[k], size: 0.13, trail: true, child: true });
    }
  }
  if (w.onExplode) w.onExplode(G, p);
  G.ev.boom?.(p, w);
}

export function updateProjectiles(G, dt) {
  for (let i = G.projectiles.length - 1; i >= 0; i--) {
    const p = G.projectiles[i];
    if (p.stuck) {                                  // talon bolts ride along with what they hit, then blow
      p.fuse -= dt;
      const u = p.stuck.unit;
      if (u && u.alive) p.pos.copy(u.pos).add(p.stuck.off);
      p.mesh.position.copy(p.pos);
      p.mesh.material.color.setHex(Math.sin(p.fuse * 40) > 0 ? 0xffffff : p.w.color);
      if (p.fuse <= 0) {
        G.scene.remove(p.mesh); G.projectiles.splice(i, 1);
        explode(G, p.pos, p.owner, { ...p.w, mode: 'plain', stick: null, noDirect: true }, null);
      }
      continue;
    }
    p.vel.y -= (p.w.grav ?? 4) * dt; p.life -= dt;
    if (p.w.mode === 'homing') {                    // cards curve toward the nearest enemy ahead
      const fwd = p.vel.clone().normalize();
      let best = null, bd = 25;
      for (const u of [...G.heroes, ...G.minions]) {
        if (!u.alive || u.team === p.team || (u.kind === 'hero' && isHidden(u))) continue;
        const to = chestOf(u).sub(p.pos), d = to.length();
        if (d < bd && to.normalize().dot(fwd) > 0.75) { bd = d; best = u; }
      }
      if (best) p.vel.lerp(chestOf(best).sub(p.pos).normalize().multiplyScalar(p.w.speed), Math.min(1, dt * 3.5));
      p.mesh.rotation.y += dt * 22;
    }
    const step = p.vel.length() * dt;
    if (p.w.maxRange && (p.trav += step) > p.w.maxRange) p.life = 0;        // shots fizzle out past their weapon's range
    const d = p.vel.clone().normalize();
    if (G.projHook?.(G, p, d, step)) { G.scene.remove(p.mesh); G.projectiles.splice(i, 1); continue; }   // Smash Ball: it hit the ball
    const r = trace(G, p.pos, d, step, p.team);
    if (p.w.bounce && r.t < step && !r.unit && (p.bounces || 0) < p.w.bounce) {
      // Tilt's steel balls: bounce off floors and walls (whichever way they were mostly heading), a little slower each time
      p.pos.copy(r.point).addScaledVector(d, -0.05);
      const vy = Math.abs(p.vel.y), vh = Math.hypot(p.vel.x, p.vel.z);
      if (p.vel.y < 0 && vy > vh * 0.45) p.vel.y = vy * 0.72;
      else if (Math.abs(p.vel.x) > Math.abs(p.vel.z)) p.vel.x *= -0.8; else p.vel.z *= -0.8;
      p.bounces = (p.bounces || 0) + 1;
      if (p.owner?.def?.passive?.id === 'extraball') p.w = { ...p.w, dmg: p.w.dmg * (1 + p.owner.def.passive.bonus) };   // Extra Ball
      spark(G, r.point); G.ev.bump?.(r.point, true);
      continue;
    }
    if (r.t < step || p.life <= 0) {
      if (p.w.stick && r.t < step) {                // stick instead of exploding
        p.pos.copy(r.point);
        p.stuck = { unit: r.unit, off: r.unit ? r.point.clone().sub(r.unit.pos) : new THREE.Vector3() };
        p.fuse = p.w.stick.fuse; p.mesh.scale.setScalar(1.6);
        if (r.unit) damage(G, r.unit, p.w.stick.dmg * (r.head ? p.w.head : 1), p.owner, r.head);
        else spark(G, r.point);
        continue;
      }
      // remove first: if an explosion ever throws, the shell must not re-explode every frame
      G.scene.remove(p.mesh); G.projectiles.splice(i, 1);
      explode(G, r.t < step ? r.point : p.pos, p.owner, p.w, r.t < step && r.unit ? r : null);
      continue;
    }
    const prev = p.pos.clone();
    p.pos.addScaledVector(d, step); p.mesh.position.copy(p.pos);
    if (p.w.arrow) p.mesh.lookAt(v3.copy(p.pos).add(d));
    if (p.w.box) p.mesh.rotation.x += dt * 8;
    p.trailT -= dt;
    if (p.w.trail && p.trailT <= 0) { p.trailT = 0.03; tracer(G, prev, p.pos, p.w.color || 0xffffff, 0.2); }
  }
}

export function tickHero(G, h, dt) {
  h.fireT -= dt;
  if (h.bleedT > 0) { h.bleedT -= dt; damage(G, h, h.bleedDps * dt, h.bleedSrc, false, true, true); }
  if (h.frost) h.frost = Math.max(0, h.frost - dt * 0.8);
  if (h.reloadT > 0) { h.reloadT -= dt; if (h.reloadT <= 0) { h.reloadT = 0; h.ammo = h.def.weapon.mag; } }
  tickStatus(G, h, dt);
  if (h.stunT > 0 || h.rootT > 0) { h.vel.x *= 0.8; h.vel.z *= 0.8; }
  // fountains: heal at home, burn trespassers
  const home = h.team === 'blue' ? -1 : 1;
  const zHome = home * (G.map.L - 5), zEnemy = -zHome;
  const fountains = G.mode === 'lane' || G.mode === 'hill' || G.mode === 'cart' || G.mode === 'raid' || G.mode === 'ball';
  if (fountains && Math.hypot(h.pos.x, h.pos.z - zHome) < 8 && h.hp < h.maxHp) { h.hp = Math.min(h.maxHp, h.hp + TUNING.fountainHeal * dt); setBar(h); }
  if (fountains && Math.hypot(h.pos.x, h.pos.z - zEnemy) < 8) damage(G, h, 90 * dt, null);
  if (G.mode === 'survivor') survivorPreMove(G, h);
  wallClimb(G, h);
  h.onGround = moveBody(h, dt, G.colliders);
  if (G.mode === 'survivor') survivorPostMove(G, h);
  afterMove(G, h, dt);
  if (!h.isPlayer) {
    const spd = Math.hypot(h.vel.x, h.vel.z);
    h.anim(dt, h.onGround ? spd : 0, G.time);
    poseHero(G, h, dt, G.camera, G.playerTeam);
  }
}

// Dead heroes still need their fall animation played out.
export function tickCorpse(G, h, dt) {
  if (!h.isPlayer && h.deathT < 1.5) poseHero(G, h, dt, G.camera, G.playerTeam);
}

// ---------- minions & towers ----------
function nearestEnemy(G, u, range, kinds) {
  let best = null, bd = range;
  for (const list of kinds) for (const e of list) {
    if (!e.alive || e.team === u.team) continue;
    if (e.kind === 'core' && !coreVulnerable(G, e.team)) continue;
    const d = Math.hypot(e.pos.x - u.pos.x, e.pos.z - u.pos.z) - (e.rad || 0);
    if (d < bd) { bd = d; best = e; }
  }
  return best ? { e: best, d: bd } : null;
}

export function updateMinions(G, dt) {
  for (let i = G.minions.length - 1; i >= 0; i--) {
    const m = G.minions[i];
    if (!m.alive) { G.minions.splice(i, 1); continue; }
    if (m.update) { m.update(G, m, dt); continue; }
    if (m.puppet) { puppetMinion(G, m, dt); continue; }
    m.atkT -= dt;
    m.lunge = Math.max(0, (m.lunge || 0) - dt * 5);
    if (m.stunT > 0) {
      m.stunT -= dt; m.vel.x *= 0.8; m.vel.z *= 0.8; moveBody(m, dt, G.colliders);
      m.mesh.position.copy(m.pos); m.mesh.rotation.z = Math.sin(G.time * 14) * 0.2;
      continue;
    }
    m.mesh.rotation.z = 0;
    let tgt = nearestEnemy(G, m, 10, [G.minions, G.heroes, G.structures]);
    // no shooting (or chasing) through walls: heroes and minions need a clear line, checked a few
    // times a second. Towers and cores are big targets in the open lane, so they skip the check.
    if (tgt && (tgt.e.kind === 'hero' || tgt.e.kind === 'minion')) {
      if (m.losFor !== tgt.e || G.time > (m.losAt || 0)) { m.losFor = tgt.e; m.losAt = G.time + 0.25; m.losOk = hasLOS(chestOf(m), chestOf(tgt.e), G.colliders); }
      if (!m.losOk) tgt = null;
    }
    let gx, gz, stop = false;
    if (tgt && tgt.d < TUNING.minionRange) {
      stop = true;
      if (m.atkT <= 0) {
        m.atkT = 1; m.lunge = 1;
        tracer(G, chestOf(m), chestOf(tgt.e), TEAM_COLOR[m.team], 0.08);
        damage(G, tgt.e, TUNING.minionDmg, m);
      }
      gx = tgt.e.pos.x; gz = tgt.e.pos.z;
    } else if (tgt) { gx = tgt.e.pos.x; gz = tgt.e.pos.z; }
    else {
      const w = m.path[Math.min(m.wp, m.path.length - 1)];
      gx = w[0]; gz = w[1];
      if (Math.hypot(gx - m.pos.x, gz - m.pos.z) < 2 && m.wp < m.path.length - 1) m.wp++;
    }
    let dx = gx - m.pos.x, dz = gz - m.pos.z;
    const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    // separation
    for (const o of G.minions) {
      if (o === m) continue;
      const ox = m.pos.x - o.pos.x, oz = m.pos.z - o.pos.z, od = ox * ox + oz * oz;
      if (od < 1.2 && od > 1e-6) { dx += ox / od * 0.4; dz += oz / od * 0.4; }
    }
    const sp = stop ? 0 : TUNING.minionSpeed;
    if (m.knockT > 0) m.knockT -= dt; else { m.vel.x = dx * sp; m.vel.z = dz * sp; }
    moveBody(m, dt, G.colliders);
    m.bob += dt * (stop ? 3 : 9);
    m.mesh.rotation.y = Math.atan2(-(gx - m.pos.x), -(gz - m.pos.z));
    const fwd = m.lunge * 0.35, yy = m.mesh.rotation.y;
    m.mesh.position.set(m.pos.x - Math.sin(yy) * fwd, m.pos.y + Math.abs(Math.sin(m.bob)) * 0.12, m.pos.z - Math.cos(yy) * fwd);
    m.body.rotation.z = stop ? 0 : Math.sin(m.bob) * 0.12;                // waddle
    m.body.scale.y = 1 - m.lunge * 0.15;
  }
}

export function updateStructures(G, dt) {
  for (const s of G.structures) {
    if (!s.alive) {
      if (s.collapseT > 0) { s.collapseT -= dt; const k = 1 - s.collapseT; s.mesh.scale.y = 1 - k * 0.6; s.mesh.rotation.z = Math.sin(k * 30) * 0.04 * (1 - k); }
      continue;
    }
    const orb = s.mesh.getObjectByName('orb');
    if (orb) { orb.rotation.y += dt * 0.8; s.pulse = Math.max(0, (s.pulse || 0) - dt * 4); orb.scale.setScalar(1 + s.pulse * 0.35); orb.position.y = (s.kind === 'tower' ? 4.8 : 3.6) + Math.sin(G.time * 1.5) * 0.12; }
    if (s.kind !== 'tower' || (G.net && !G.net.host)) continue;          // online, only the host's towers fire (guests see the shots)
    s.atkT -= dt;
    if (s.atkT > 0) continue;
    const top = new THREE.Vector3(s.pos.x, 4.8, s.pos.z);
    let tgt = nearestEnemy(G, s, TUNING.towerRange, [G.minions]);
    if (!tgt) {
      tgt = nearestEnemy(G, s, TUNING.towerRange, [G.heroes]);
      if (tgt && (isHidden(tgt.e) || !hasLOS(top, chestOf(tgt.e), G.colliders))) tgt = null;
    }
    if (!tgt) continue;
    s.atkT = TUNING.towerRate; s.pulse = 1;
    tracer(G, top, chestOf(tgt.e), TEAM_COLOR[s.team], 0.25, 3);
    G.net?.towerShot?.(s, tgt.e);
    damage(G, tgt.e, tgt.e.kind === 'minion' ? 35 : TUNING.towerDmg, s);
  }
}

// ---------- effects ----------
export function tracer(G, a, b, color, life = 0.08, width = 1) {
  const geo = new THREE.BufferGeometry().setFromPoints([a.clone(), b.clone()]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 1, linewidth: width }));
  G.scene.add(line);
  G.fx.push({ obj: line, life, max: life, kind: 'fade' });
}
function spark(G, p) { burst(G, p, 0xfff3e0, 0.25); }
export function burst(G, p, color, size) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
  m.position.copy(p); m.scale.setScalar(size * 0.3);
  G.scene.add(m);
  G.fx.push({ obj: m, life: 0.35, max: 0.35, kind: 'grow', size });
}
export function ring(G, p, color, r) {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(p.x, p.y + 0.15, p.z);
  G.scene.add(m);
  G.fx.push({ obj: m, life: 0.45, max: 0.45, kind: 'grow', size: r });
}
export function updateFx(G, dt, camera) {
  tickLight(G, dt);
  for (let i = G.fx.length - 1; i >= 0; i--) {
    const f = G.fx[i]; f.life -= dt;
    const k = Math.max(0, f.life / f.max);
    if (tickVfx(G, f, dt, k)) { if (f.life <= 0) { G.scene.remove(f.obj); if (!f.shared) f.obj.geometry?.dispose(); f.obj.material.dispose(); G.fx.splice(i, 1); } continue; }
    f.obj.material.opacity = f.kind === 'debris' || f.kind === 'float' || f.kind === 'fly' ? Math.min(1, k * 3) : k * 0.9;
    if (f.kind === 'grow') f.obj.scale.setScalar(f.size * (1.1 - k * 0.8));
    else if (f.kind === 'float') { f.obj.position.y += dt * 1.6; f.obj.scale.multiplyScalar(1 - dt * 0.4); }
    else if (f.kind === 'fly') { f.obj.position.addScaledVector(f.vel, dt); const pr = f.obj.getObjectByName('prop'); if (pr) pr.rotation.z += dt * 40; }
    else if (f.kind === 'debris') {
      f.vel.y -= 20 * dt; f.obj.position.addScaledVector(f.vel, dt);
      if (f.obj.position.y < 0.1) { f.obj.position.y = 0.1; f.vel.multiplyScalar(0.5); f.vel.y = Math.abs(f.vel.y) * 0.4; }
      f.obj.rotation.x += dt * f.spin; f.obj.rotation.y += dt * f.spin * 0.7;
    }
    if (f.life <= 0) { G.scene.remove(f.obj); if (f.kind !== 'float') f.obj.geometry?.dispose(); f.tex?.dispose(); f.obj.material.dispose(); G.fx.splice(i, 1); }
  }
  // billboard the health bars: undo the parent's rotation, then face the camera
  for (const u of [...G.heroes, ...G.minions, ...G.structures]) {
    if (!u.bar || !u.mesh.visible) continue;
    tmpQ.setFromEuler(u.mesh.rotation).invert().multiply(camera.quaternion);
    u.bar.quaternion.copy(tmpQ);
  }
}

// Online guests: a host minion glides toward its last reported spot and waddles while moving.
function puppetMinion(G, m, dt) {
  const t = m.netPos;
  if (t) {
    const dx = t.x - m.pos.x, dz = t.z - m.pos.z, d = Math.hypot(dx, dz);
    if (d > 6) m.pos.set(t.x, 0, t.z); else { m.pos.x += dx * Math.min(1, dt * 8); m.pos.z += dz * Math.min(1, dt * 8); }
    if (d > 0.05) m.mesh.rotation.y = Math.atan2(-dx, -dz);
    m.bob += dt * (d > 0.15 ? 9 : 3);
    m.body.rotation.z = d > 0.15 ? Math.sin(m.bob) * 0.12 : 0;
  }
  m.pos.y = 0;
  m.mesh.position.set(m.pos.x, Math.abs(Math.sin(m.bob)) * 0.12, m.pos.z);
}
