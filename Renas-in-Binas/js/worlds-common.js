import { THREE, G, V3, toon, basic, mk, LL, frameDir, surf, clamp, tangentTo, stepDir, placeOn, banner, toast, puff } from './core.js?v=20261112i';
import { sfx } from './audio.js?v=20261112i';
import { P, hurtPlayer, bouncePlayer } from './player.js?v=20261112i';
import { SurfaceWall } from './fx.js?v=20261112i';
import { World, addStars, addBackdropPlanet } from './world.js?v=20261112i';
import { play, shot } from './cutscene.js?v=20261112i';
import { buildRocket, buildLaunchStar, textBoard } from './models.js?v=20261112i';

import { startDuel } from './duels.js?v=20261112i';
export { World, addStars, addBackdropPlanet, LL, frameDir, V3, toon, basic, mk, THREE, surf, G, P, sfx, play, shot };
export const slerpDir = (a, b, k) => a.clone().lerp(b, k).normalize();

// ---------- coins ----------
export function coinRing(w, pl, center, radius, n, alt = 0.8) {
  const deg = (radius / pl.r) * (180 / Math.PI);
  for (let i = 0; i < n; i++) w.addPickup(pl, frameDir(center, 90 - deg, (i / n) * 360), alt, 'coin');
}
export function coinLine(w, pl, a, b, n, alt = 0.8) {
  for (let i = 0; i < n; i++) w.addPickup(pl, slerpDir(a, b, n === 1 ? 0.5 : i / (n - 1)), alt, 'coin');
}
export function coinOn(w, pf, n = 1) {   // coins floating above a platform
  for (let i = 0; i < n; i++) w.addPickup(pf.planet, n === 1 ? pf.n : frameDir(pf.n, 90 - 1.6, (i / n) * 360), pf.h + 0.8, 'coin');
}

// ---------- decor ----------
export function palm(w, pl, dir, trunkC, leafC, h = 5.5, glow) {
  const g = new THREE.Group();
  const tm = toon(trunkC);
  for (let i = 0; i < 6; i++) mk(new THREE.CylinderGeometry(0.22 - i * 0.015, 0.28 - i * 0.015, h / 6, 8), tm, Math.sin(i * 0.3) * 0.3, (i + 0.5) * (h / 6), 0, g, 1.1);
  const lm = toon(leafC);
  for (let i = 0; i < 6; i++) {
    const piv = new THREE.Group(); piv.position.set(0.3, h, 0); piv.rotation.y = (i / 6) * Math.PI * 2; g.add(piv);
    const l = mk(new THREE.ConeGeometry(0.35, 2.4, 4), lm, 0, -0.3, 1.1, piv, 1.06); l.rotation.x = Math.PI / 2 + 0.5;
  }
  if (glow) mk(new THREE.SphereGeometry(0.35, 10, 8), basic(glow), 0.3, h + 0.2, 0, g, 0);
  w.put(pl, g, dir, -0.1, Math.random() * 6);
  w.addSolid(pl, dir, 0.4, h);
  return g;
}
export function crystal(w, pl, dir, color = 0x5ef2e0, s = 1, solid = true) {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const c = mk(new THREE.OctahedronGeometry(0.45 * s), toon(i % 2 ? color : 0xffffff), (i - 1.5) * 0.35 * s, 0.6 * s, (i % 2) * 0.3 * s, g, 1.08);
    c.scale.y = 2 + (i % 3) * 0.5; c.rotation.z = (i - 1.5) * 0.3;
  }
  w.put(pl, g, dir, 0, Math.random() * 6);
  if (solid) w.addSolid(pl, dir, 0.8 * s, 1.8 * s);
  return g;
}
export function rock(w, pl, dir, s = 1, color = 0x8a8698) {
  const g = new THREE.Group();
  const r = mk(new THREE.DodecahedronGeometry(0.9 * s, 0), toon(color), 0, 0.4 * s, 0, g, 1 + 0.08 / s);
  r.scale.y = 0.7; r.rotation.set(Math.random(), Math.random(), 0);
  w.put(pl, g, dir, 0);
  w.addSolid(pl, dir, 0.8 * s, 0.9 * s);
  return g;
}
export function lamp(w, pl, dir, color = 0xffd36a, h = 3) {
  const g = new THREE.Group();
  mk(new THREE.CylinderGeometry(0.07, 0.1, h, 8), toon(0x2b2440), 0, h / 2, 0, g, 1.15);
  mk(new THREE.SphereGeometry(0.28, 12, 10), basic(color), 0, h + 0.1, 0, g, 1.12);
  g.add(Object.assign(new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 10), basic(color, { transparent: true, opacity: 0.15, depthWrite: false }))));
  g.children[g.children.length - 1].position.y = h + 0.1;
  w.put(pl, g, dir, 0);
  w.addSolid(pl, dir, 0.2, h);
  return g;
}
export function sign(w, pl, dir, board, yaw = 0, alt = 2) {
  const g = new THREE.Group();
  mk(new THREE.CylinderGeometry(0.06, 0.06, alt, 6), toon(0x6a4a2a), 0, alt / 2, 0, g, 0);
  board.position.y = alt; g.add(board);
  w.put(pl, g, dir, 0, yaw);
  return g;
}
// a speaker that thumps out a small shockwave ring every few seconds: jump over it
export function pulseSpeaker(w, pl, dir, o = {}) {
  const every = o.every ?? 3.2, max = o.max ?? 0.42, color = o.color ?? 0xff3d7f;
  const wall = new SurfaceWall(w.group, pl, color, 0.65, 64);
  let t = o.offset ?? Math.random() * every, th = -1;
  w.updaters.push((dt) => {
    t -= dt;
    if (t <= 0) { t = every; th = 0.07; wall.visible = true; if (P.planet === pl && P.pos.distanceTo(surf(pl, dir)) < 22) sfx.bass(); if (o.onPump) o.onPump(); }
    if (th < 0) return;
    th += 0.36 * dt;
    if (th > max) { th = -1; wall.visible = false; return; }
    wall.ring(dir, th); wall.mat.opacity = 0.85 * (1 - th / max) + 0.1;
    if (P.planet === pl && !G.cutscene) {
      const thp = Math.acos(clamp(P.up.dot(dir), -1, 1));
      if (Math.abs(thp - th) * pl.r < 0.45 && P.alt < 0.5) hurtPlayer(surf(pl, dir, 0));
    }
  });
}

// ---------- the rocket you arrive in ----------
export function addRocket(w, ctx, pl, dir) {
  const r = buildRocket();
  w.put(pl, r.g, dir, 0, 0.4);
  w.addSolid(pl, dir, 0.85, 3.6);
  w.rocket = r;
  w.addInteract({ planet: pl, pos: surf(pl, dir, 0.5), radius: 2.6, prompt: () => (w.nextName ? `<kbd>E</kbd> rocket: fly on to ${w.nextName}` : '<kbd>E</kbd> rocket: travel'), use: () => ctx.openTravel() });
  return r;
}

// ---------- quest items (vinyls, lanterns, baseballs) ----------
export function questItem(w, ctx, pl, dir, alt, id, model) {
  if (ctx.ws(w).items.includes(id)) return null;
  return w.addPickup(pl, dir, alt, 'quest', { model, id, radius: 1.4, spin: 1.6, onTake: () => ctx.gotQuest(w, id) });
}
export function rareItem(w, ctx, pl, dir, alt, id, name) {
  if (ctx.save.rares[id]) return null;
  return w.addPickup(pl, dir, alt, 'rare', { id, name, onTake: () => ctx.gotRare(id) });
}

// ---------- a friend you talk to ----------
// def: { name, first: [[who, text, sub]], progress: (got) => lines, done: lines, after: lines, bubbles: { new, progress, done } }
export function setupFriend(w, ctx, npc, def) {
  const st = ctx.ws(w);
  st.fstate = st.fstate || 'new';
  const cam = ctx.talkCam(npc);
  const steps = (lines) => { P.talkTo = npc; P.vt.set(0, 0, 0); return lines.map(([who, text, sub]) => ({ say: { who, text, sub }, cam })); };   // Rênas turns to face npc while talking
  npc.lines = () => def.bubbles[st.fstate === 'done' ? 'done' : st.fstate === 'new' ? 'new' : 'progress'];
  w.addBubble(npc, npc.bubbleY);
  w.addInteract({
    planet: npc.planet, pos: () => npc.g.position, radius: 2.9,
    prompt: () => `<kbd>E</kbd> talk to ${def.name}`,
    use: () => {
      const q = w.quest;
      if (st.fstate === 'new') {
        play(steps(def.first), () => { st.fstate = 'progress'; ctx.persist(); ctx.hud(); });
      } else if (st.fstate === 'progress' && q.got < q.need) play(steps(def.progress(q.got)), () => {});
      else if (st.fstate === 'progress' && !localsDone(w)) play(steps(def.needLocals(localsLeft(w))), () => {});
      else if (st.fstate === 'progress') play(steps(def.done), () => { st.fstate = 'done'; ctx.persist(); w.unlockLaunch(); ctx.hud(); });
      else play(steps(def.after), () => {});
    },
  });
  w.friendState = () => st.fstate;
  w.friendDef = def;   // addMore() adds lines to it later
}
export { buildLaunchStar, tangentTo, stepDir, placeOn, banner, toast };

// ---------- the locals: small side quests ----------
// Everyone you help gives you a star shard. The Launch Star only wakes up when the friend has their items AND every shard is in.
// o: { id, name, who, model, dir, yaw, bubbleY, anim, task, first, progress(loc), done, after, bubbles }
// task: { type: 'fetch', dir, alt, model, banner } or { type: 'stomp', enemy, at, n, spread } or { type: 'duel', game, ... } (see duels.js)
export const localsDone = (w) => !w.locals || w.locals.every((l) => l.state() === 'done');
export const localsLeft = (w) => (w.locals || []).filter((l) => l.state() !== 'done').map((l) => l.name);
export function setupLocal(w, ctx, o) {
  const st = ctx.ws(w); st.side = st.side || {};
  const S = () => st.side[o.id] || 'new';            // new > progress > got (task finished, go tell them) > done
  const set = (v) => { st.side[o.id] = v; ctx.persist(); ctx.hud(); };
  const npc = w.addNPC(w.main, o.model, o.dir, { name: o.name, bubbleY: o.bubbleY || 2.2, yaw: o.yaw || 0, anim: o.anim });
  const T = o.task;
  const loc = { id: o.id, name: o.name, who: o.who, npc, task: T, state: S, item: null, bugs: [], left: 0 };
  (w.locals = w.locals || []).push(loc);
  // a bobbing "!" over their head while they need you; it turns cyan once you can report back
  const mark = new THREE.Group();
  const mm = toon(0xffd23a);
  mk(new THREE.CapsuleGeometry(0.11, 0.32, 4, 8), mm, 0, 0.32, 0, mark, 1.15);
  mk(new THREE.SphereGeometry(0.11, 10, 8), mm, 0, -0.04, 0, mark, 1.15);
  npc.g.add(mark);
  w.updaters.push((dt, t) => {
    const s = S();
    mark.visible = s === 'new' || s === 'got';
    mark.position.y = (o.bubbleY || 2.2) + 0.35 + Math.sin(t * 3) * 0.1;
    mm.color.setHex(s === 'got' ? 0x5ef2e0 : 0xffd23a);
    if (loc.duel && loc.run) loc.run.update(dt);
  });
  const finish = (msg) => { set('got'); sfx.quest(); G.radio(o.who, msg); };
  const begin = () => {
    if (T.type === 'duel') {
      if (loc.duel) return;
      w.hudRefresh = ctx.hud;
      loc.run = startDuel(w, loc, T, () => finish(T.found || 'You beat me! Come get your star shard!'), (text) => { ctx.hud(); if (text) G.radio(o.who, text); });
      return;
    }
    if (T.type === 'fetch') {
      if (loc.item) return;
      loc.item = w.addPickup(w.main, T.dir, T.alt, 'side', { model: T.model, radius: 1.4, spin: 1.6, onTake: () => { banner(T.banner, `Bring it to ${o.name}`, '#9fe8ff'); finish(T.found || 'You found it! Come back to me!'); } });
    } else {
      loc.bugs.forEach((e) => { if (!e.dead) e.kill(true); });
      loc.bugs = []; loc.left = T.n;
      for (let i = 0; i < T.n; i++) {
        const d = frameDir(T.at, 90 - (T.spread || 5), (i / T.n) * 360 + 20);
        loc.bugs.push(w.addEnemy(w.main, d, T.enemy, { roam: 0.08, drops: 1, onDie: () => {
          loc.left = Math.max(0, loc.left - 1); ctx.hud();
          if (loc.left > 0) toast(`${loc.left} left!`, 1200);
          else finish(T.found || 'They’re all gone! Come back to me!');
        } }));
      }
    }
  };
  const cam = ctx.talkCam(npc);
  const steps = (lines) => { P.talkTo = npc; P.vt.set(0, 0, 0); return lines.map(([who, text, sub]) => ({ say: { who, text, sub }, cam })); };   // Rênas turns to face npc while talking
  npc.lines = () => o.bubbles[S() === 'done' ? 'done' : S() === 'new' ? 'new' : 'progress'];
  w.addBubble(npc, npc.bubbleY);
  w.addInteract({
    planet: w.main, pos: () => npc.g.position, radius: 2.6, cond: () => !loc.duel,
    prompt: () => `<kbd>E</kbd> talk to ${o.name}`,
    use: () => {
      const s = S();
      if (s === 'new') play(steps(o.first), () => { set('progress'); begin(); if (T.type !== 'duel') toast('Your goal is at the top of the screen!', 2400); });
      else if (s === 'progress') play(steps(o.progress(loc)), () => { if (T.type === 'duel') begin(); });   // a duel: talk again for a rematch
      else if (s === 'got') play(steps(o.done), () => { set('done'); ctx.gotShard(w, o.id); });
      else play(steps(o.after), () => {});
    },
  });
  if (S() === 'progress' && T.type !== 'duel') begin();
  return loc;
}

// ---------- ground hazards for the newer planets ----------
// Lava: standing on the bare planet surface where test(up) is true burns you and hops you out, like in Mario.
export function lavaFloor(w, pl, test, color = 0xff6a2a) {
  w.updaters.push(() => {
    if (P.planet !== pl || P.dead || G.cutscene || !P.grounded || P.ground !== pl.surface || !test(P.up)) return;
    puff(P.pos.clone().addScaledVector(P.up, 0.2), 14, color, 4, 1.2, P.up);
    if (P.inv <= 0) hurtPlayer(P.pos.clone().addScaledVector(P.up, -1), 2);
    bouncePlayer(15); sfx.thud();
    if (G.toastOnce) G.toastOnce('lava', 'HOT HOT HOT! Lava burns. Stay on the rocks and platforms.');
  });
}
// Quicksand: on the bare surface where test(up) is true you wade at half speed and slowly sink
export function quicksand(w, pl, test, color = 0xd8b070) {
  w.updaters.push((dt) => {
    if (P.planet !== pl || P.dead || !P.grounded || P.ground !== pl.surface || !test(P.up)) return;
    P.vt.multiplyScalar(Math.exp(-dt * 6));
    if (Math.random() < dt * 10) puff(P.pos.clone().addScaledVector(P.up, 0.1), 1, color, 1, 0.2, P.up);
    if (G.toastOnce) G.toastOnce('quicksand', 'Quicksand! You wade slowly here. Jump to get through it faster.');
  });
}
// Wind: every `every` seconds a gust of `len` seconds pushes you along the surface (a sandstorm, a solar wind)
export function gusts(w, pl, o = {}) {
  const every = o.every ?? 11, len = o.len ?? 3.5, power = o.power ?? 5, color = o.color ?? 0xe8c890;
  const st = { t: o.delay ?? 6, on: false, dir: V3(1, 0, 0) };
  w.gust = st;
  w.updaters.push((dt) => {
    st.t -= dt;
    if (!st.on && st.t <= 0) { st.on = true; st.t = len; st.dir.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(); sfx.whoosh(); if (P.planet === pl && o.text) toast(o.text, 1800); }
    else if (st.on && st.t <= 0) { st.on = false; st.t = every; }
    if (!st.on || P.planet !== pl || P.dead || G.cutscene || w.inPark) return;
    const push = st.dir.clone().addScaledVector(P.up, -st.dir.dot(P.up));
    if (push.lengthSq() < 1e-6) return;
    push.normalize();
    P.vt.addScaledVector(push, power * dt * (P.grounded ? 1 : 0.6));
    if (Math.random() < dt * 30) puff(P.pos.clone().addScaledVector(P.up, 0.4 + Math.random() * 1.5).addScaledVector(push, -3), 1, color, 3, 0.8, push);
  });
}
// A geyser (lava or steam): a warning puff, then a column that hurts you, then quiet again.
// Standing on its rock when it's quiet is safe; the column shoots you up if you're on top of it when it fires
export function geyser(w, pl, dir, o = {}) {
  const color = o.color ?? 0xff6a2a, period = o.period ?? 5, ph = o.phase ?? 0, launch = o.launch ?? false;
  const rock = new THREE.Group();
  mk(new THREE.CylinderGeometry(0.9, 1.2, 0.5, 10), toon(o.rock ?? 0x3a3038), 0, 0.25, 0, rock, 1.06);
  mk(new THREE.CircleGeometry(0.55, 14), basic(color), 0, 0.51, 0, rock, 0).rotation.x = -Math.PI / 2;
  w.put(pl, rock, dir, 0);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 7, 12, 1, true), basic(color, { transparent: true, opacity: 0.75, depthWrite: false }));
  col.position.y = 3.5; const holder = new THREE.Group(); holder.add(col); w.put(pl, holder, dir, 0.5); col.visible = false;
  w.updaters.push((dt, t) => {
    const k = ((t + ph) % period) / period;          // 0..1
    const warn = k > 0.62 && k < 0.78, fire = k >= 0.78 && k < 0.93;
    if (warn && Math.random() < dt * 14) puff(surf(pl, dir, 0.6), 1, color, 1.5, 0.3, dir);
    col.visible = fire; col.scale.set(1 + Math.sin(t * 30) * 0.08, fire ? Math.min(1, (k - 0.78) * 30) : 0.01, 1 + Math.cos(t * 30) * 0.08);
    if (!fire || P.planet !== pl || P.dead) return;
    const d = Math.acos(clamp(P.up.dot(dir), -1, 1)) * pl.r;
    if (d > 1.0 || P.alt > 7) return;
    if (launch) { if (P.vr < 18) { bouncePlayer(24); sfx.launch(); } }
    else if (P.inv <= 0) { hurtPlayer(surf(pl, dir, 0)); bouncePlayer(14); }
  });
}

// ---------- more to do on every planet ----------
// Two more quest items (a golden Kattenbot runs off with number 4, number 5 waits on top of the Zweeftoren)
// and a third local up north with their own side quest.
// o: { item: () => model, prefix, color, top, runnerAt, towerAt, friendLine, local: { ...setupLocal options, itemAt } }
export function addMore(w, ctx, pl, o) {
  const st = ctx.ws(w), deg = (u) => (u / pl.r) * 180 / Math.PI;
  w.quest.need = 5;
  // 4: the golden Kattenbot. Stomp it and it drops what it stole
  if (!st.items.includes(o.prefix + '4')) {
    const gb = w.addEnemy(pl, o.runnerAt || LL(30, 300), 'goldbot', { roam: 0.7, drops: 3, onDie: (e) => { questItem(w, ctx, pl, e.dir.clone(), 0.9, o.prefix + '4', o.item()); } });
    const carried = o.item(); carried.scale.multiplyScalar(0.4); gb.m.ball.add(carried);
  }
  // 5: the Zweeftoren, a spiral of floating platforms with the item on top
  const T = o.towerAt || LL(-55, 165);
  const color = o.color ?? 0x6a7a96, top = o.top ?? 0x9fe8ff;
  for (let i = 0; i < 7; i++) {
    const pf = w.addPlatform(pl, { dir: frameDir(T, 90 - deg(2.7), i * 55), r: 1.0, h: 1.0 + i * 1.15, float: true, thick: 0.35, color, top, ...(i % 3 === 2 ? { bob: [0.3, 1.2, i] } : {}) });
    if (i < 6) coinOn(w, pf);
  }
  w.addPlatform(pl, { dir: T, r: 1.5, h: 9.2, float: true, thick: 0.5, color, top: 0xffd23a });
  questItem(w, ctx, pl, T, 10.2, o.prefix + '5', o.item());
  {
    const pole = new THREE.Group();
    mk(new THREE.CylinderGeometry(0.12, 0.16, 8.7, 8), toon(color), 0, 4.35, 0, pole, 0);
    w.put(pl, pole, T, 0);
  }
  sign(w, pl, frameDir(T, 90 - deg(4.6), 200), textBoard('▲ ZWEEFTOREN', 2.8, 0.7, '#fff8ec', '#2b2440'), 0, 1.8);
  // the friend mentions both, and the third local
  const def = w.friendDef, who = w.friendName.toUpperCase();
  if (def) {
    def.first.push([who, o.friendLine || 'Oh, and I almost forgot! There are two more. A golden Kattenbot ran off with one, and the last one ended up on top of the Zweeftoren, the sky tower. That makes five!']);
    def.first.push([who, `And ${o.local.name} up north needs help too. That’s one more star shard.`]);
    const prog = def.progress;
    def.progress = (got) => prog(got).concat([[who, 'Don’t forget the golden Kattenbot and the top of the Zweeftoren!']]);
  }
  // the third local, with a little staircase up to their lost thing (or a few enemies to stomp)
  const L = o.local, at = L.itemAt || LL(68, 200);
  if (L.task.type === 'fetch') {
    [[200, 1.2], [260, 2.3], [320, 3.4]].forEach(([az, h]) => w.addPlatform(pl, { dir: frameDir(at, 90 - deg(2.6), az), r: 1.0, h, float: true, thick: 0.35, color, top }));
    w.addPlatform(pl, { dir: at, r: 1.3, h: 4.4, float: true, thick: 0.4, color, top: 0xffd23a });
    L.task = { ...L.task, dir: at, alt: 5.2 };
  } else L.task = { ...L.task, at, spread: L.task.spread || 5 };
  setupLocal(w, ctx, { dir: LL(56, 30), bubbleY: 2.0, ...L });
}
// the stem (and a leaf) on top of an apple- or pumpkin-shaped planet, at the north pole
export function planetStem(w, pl, o = {}) {
  const up = V3(0, 1, 0), g = new THREE.Group(), h = o.h ?? 4, r0 = o.r0 ?? 0.6;
  const stem = mk(new THREE.CylinderGeometry(o.r1 ?? 0.35, r0, h, 10), toon(o.color ?? 0x6a4a2a), 0, h / 2 - 0.5, 0, g, 1.06);
  stem.rotation.z = o.tilt ?? 0.22;
  if (o.leaf) { const leaf = mk(new THREE.SphereGeometry(1, 16, 10), toon(o.leaf), 1.5, h * 0.7, 0, g, 1.05); leaf.scale.set(1.9, 0.2, 0.95); leaf.rotation.z = -0.45; }
  w.put(pl, g, up, 0);
  w.addSolid(pl, up, r0 + 0.25, h);
  return g;
}
