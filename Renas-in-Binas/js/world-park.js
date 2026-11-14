import { World, addStars, LL, frameDir, V3, toon, basic, mk, THREE, coinRing, coinOn, sign, rareItem } from './worlds-common.js?v=20261114b';
import { fbm } from './world.js?v=20261114b';
import { buildLocal, textBoard } from './models.js?v=20261114b';
import { buildBeacon, coursePath } from './parkour.js?v=20261114b';
import { G, toast, puff, surf, placeOn, orientOn, clamp } from './core.js?v=20261114b';
import { sfx } from './audio.js?v=20261114b';
import { P, spawnPlayer, resetCam, hurtPlayer, drawHearts } from './player.js?v=20261114b';
import { play, orbitShot } from './cutscene.js?v=20261114b';

// PARKOUR PLANETS: detours on the route, between the story planets. No quest and no boss: one long course
// over a bottomless void, from the start beacon to the star gate. Every planet has its own trick:
//   Stuiterstad  - chains of trampolines and spinning bars you jump over
//   De Wisselbaan - red and blue platforms that swap on a beat, and platforms that slide side to side
//   Sterrensprong - gaps too long to jump, with dash rings that give the Komeetduik back mid-air
// Each course hides three golden gears on platforms off the path.
const R = 16;

export function buildStuiter(ctx) {
  return buildPark(ctx, {
    id: 'stuiter', index: 12, shape: 'lightning', title: 'Stuiterstad', sub: 'A parkour planet: trampolines and spinning bars.',
    host: 'Thomas', who: 'THOMAS', model: () => buildLocal({ s: 0.9, skin: 0xf0c8a0, shirt: 0xff5ab4, pants: 0xff5ab4, hair: 0x5a3416 }),
    theme: {
      sky: 'radial-gradient(ellipse at 50% 40%,#6a1a4a 0%,#2e0a22 55%,#0c0208 100%)', lights: [0xffe0f0, 0x6a2a4a],
      dome: [0xff7ab6, 0xd04a8a, 0x8a2a5a, 0xffd36a], gems: [0xffd36a, 0x5ef2e0, 0xff5ab4], core: 0x3a0a2a, glow: 0xff7ab6,
      plat: 0x5ef2e0, platTop: 0xffffff, alt: 0xffd36a, crumble: 0xc8a8b8, bounce: 0xff5ab4, puff: 0xff7ab6, cpTop: 0x5ef2e0, finTop: 0xffd23a, signFg: '#ffd36a', signBg: '#3a0a2a', beacon: [0x3a0a2a, 0xffd36a],
    },
    route: [['hop', 2], ['pads', 3], ['cp'], ['sweep', 2], ['hop', 2], ['secret', 'stuiter-r1', 'Off the trampoline path'], ['bounce'], ['zig', 2], ['cp'],
      ['pads', 4], ['sweep'], ['crumble', 2], ['secret', 'stuiter-r2', 'A secret bounce'], ['cp'], ['circle', 2], ['sweep', 2], ['pads', 2], ['bob', 2], ['secret', 'stuiter-r3', 'Right before the finish'], ['hop', 2]],
    intro: [
      ['RATJETOE', 'Detour! An asteroid storm is blocking the way to Smaragdeiland. The only safe path goes through Stuiterstad.'],
      ['RÊNAS', 'Stuiterstad? Where’s the ground?'],
      ['THOMAS', 'There is no ground! Hi, I’m Thomas. They call me The Rounder. I’m perfectly round, so I bounce everywhere. Fall off here and you drop into the void.'],
      ['THOMAS', 'Trampolines bounce you to the next one: steer in the air. And watch the spinning bars. Jump over them! I just roll under them. Round life.'],
      ['THOMAS', 'Reach the star gate at the end and you can fly on. Checkpoint beacons save your spot. Go go go!'],
    ],
    tips: [['THOMAS', 'Trampolines: steer in the air. Bars: jump over them. Beacons: checkpoints!']],
    bubbles: ['Boing!', 'Go go go!', '*rolls around*'],
    win: [
      ['THOMAS', 'YOU MADE IT! Nobody does Stuiterstad that fast. Okay, nobody without feet. And I don’t have feet. You’re the first!'],
      ['THOMAS', 'The star gate is open. The asteroid storm is behind you. Smaragdeiland is straight ahead! Roll on!'],
      ['RÊNAS', 'Boing boing! Thanks, Thomas!'],
    ],
  });
}

export function buildWissel(ctx) {
  return buildPark(ctx, {
    id: 'wissel', index: 13, shape: 'snake', title: 'De Wisselbaan', sub: 'A parkour planet: red, blue, red, blue… jump on the beat!',
    host: 'Dean', who: 'DEAN', model: () => buildLocal({ s: 0.78, skin: 0xf0c8a0, shirt: 0x8a5cff, pants: 0x2b2440, hair: 0x2b1a10, hat: 'cap', capC: 0x1fb5a6 }),
    theme: {
      sky: 'radial-gradient(ellipse at 50% 40%,#2a1a5a 0%,#100a2e 55%,#04020c 100%)', lights: [0xe0e0ff, 0x2a2a5a],
      dome: [0x2a2a5a, 0x1a1a3a, 0x0a0a1e, 0xff3a5a], gems: [0xff3a5a, 0x3a8aff, 0xffffff], core: 0x0a0a1e, glow: 0x9a7aff,
      plat: 0x8a8aa8, platTop: 0xe8e8f0, alt: 0xc8c8d8, crumble: 0x6a6a7a, bounce: 0xffd23a, puff: 0xffd23a, cpTop: 0x5ef2e0, finTop: 0xffd23a, signFg: '#ffffff', signBg: '#1a1a3a', beacon: [0x1a1a3a, 0xff3a5a],
    },
    route: [['hop', 2], ['swap', 4], ['cp'], ['slide', 3], ['hop'], ['secret', 'wissel-r1', 'Between red and blue'], ['swap', 5], ['cp'], ['crumble', 2], ['slide', 2], ['bounce'],
      ['secret', 'wissel-r2', 'Above the switches'], ['swap', 6], ['cp'], ['zig', 2], ['slide', 2], ['swap', 4], ['secret', 'wissel-r3', 'The last switch'], ['hop', 2]],
    intro: [
      ['RATJETOE', 'Detour! The path to Duinenrijk is blocked by a solar flare. Safe route: De Wisselbaan.'],
      ['DEAN', 'Welcome to De Wisselbaan! I’m Dean. Breakdancer by day, gamer by night. Here the platforms switch: red, then blue, then red again.'],
      ['DEAN', 'Listen to the ticking. It’s just like a beat. When the platforms blink, they’re about to switch. Jump to the other colour before that!'],
      ['DEAN', 'And the grey ones slide back and forth. Time your jump. The star gate at the end takes you on.'],
      ['RÊNAS', 'Red, blue, jump. Red, blue, jump. Got it!'],
    ],
    tips: [['DEAN', 'Ticking and blinking means: switch! Jump to the other colour. Feel the beat!']],
    bubbles: ['Red!', 'Blue!', '*does a windmill*'],
    win: [
      ['DEAN', 'Red, blue, DONE! Perfect rhythm, Rênas. You should try breakdancing.'],
      ['DEAN', 'The star gate is open. Duinenrijk is just past the solar flare. Have fun in the sand!'],
      ['RÊNAS', 'Thanks, Dean! I can still hear the ticking…'],
    ],
  });
}

export function buildSprong(ctx) {
  return buildPark(ctx, {
    id: 'sprong', index: 14, shape: 'star', title: 'Sterrensprong', sub: 'A parkour planet: huge gaps and dash rings.',
    host: 'Robin', who: 'ROBIN', model: () => buildLocal({ s: 0.98, skin: 0xf0c8a0, shirt: 0x3a8ad8, pants: 0x3a3e4e, hair: 0xd8a040 }),
    theme: {
      sky: 'radial-gradient(ellipse at 50% 40%,#0a3a4a 0%,#04182a 55%,#01060c 100%)', lights: [0xd0f0ff, 0x1a3a4a],
      dome: [0x0a3a4a, 0x082838, 0x041420, 0x9fe8ff], gems: [0x9fe8ff, 0xffd36a, 0xffffff], core: 0x041420, glow: 0x5ef2e0,
      plat: 0x3a6a8a, platTop: 0x9fe8ff, alt: 0x6a8aa8, crumble: 0x4a5a6a, bounce: 0xff9a2a, puff: 0x9fe8ff, cpTop: 0x5ef2e0, finTop: 0xffd23a, signFg: '#5ef2e0', signBg: '#041420', beacon: [0x041420, 0x9fe8ff],
    },
    route: [['hop', 2], ['ring'], ['cp'], ['circle', 2], ['ring'], ['secret', 'sprong-r1', 'Next to the first ring'], ['crumble', 3], ['cp'], ['ring2'], ['bob', 2], ['bounce'],
      ['secret', 'sprong-r2', 'High above the rings'], ['cp'], ['ring'], ['circle', 2], ['crumble', 2], ['ring2'], ['secret', 'sprong-r3', 'The longest jump'], ['hop', 2]],
    intro: [
      ['RATJETOE', 'Detour! Kayo & Yara mined the direct route to Maankrater. Safe path: Sterrensprong. Warning: big gaps.'],
      ['RÊNAS', 'Again?! How do those cats always know which way we’re going?'],
      ['RATJETOE', 'No idea! Lucky guess! Lucky cats! *nervous squeak*'],
      ['ROBIN', 'Hey, a real captain! I’m Robin. I’m training to be an astronaut. But the gaps here are SO scary… *sniff*'],
      ['ROBIN', 'They’re HUGE. Too far for a normal jump. But see the glowing rings? Fly through one and your Komeetduik is back.'],
      ['ROBIN', 'So: jump, dash with X, fly through the ring, dash again! Reach the star gate and you’re on your way to the moon. I’ll… cheer from here.'],
    ],
    tips: [['ROBIN', 'Jump, X, ring, X again! A ring always gives your Komeetduik back. *sniff*']],
    bubbles: ['Whoosh!', '*sniff*', 'Through the ring!'],
    win: [
      ['ROBIN', 'You did it! WAAAH! I’m crying because I’m so happy! Okay, I cry at everything. But this time it’s real!'],
      ['ROBIN', 'The star gate is open. Maankrater is right behind it. Good luck with those cats! If they’re mean, call me. I get really strong when I’m upset.'],
      ['RÊNAS', 'Thanks, Robin! You’ll be a great astronaut!'],
    ],
  });
}

export function buildPark(ctx, D) {
  const T = D.theme;
  const w = new World(D.id);
  Object.assign(w, {
    index: D.index, title: D.title, sub: D.sub, friendName: D.host, park: true,
    sky: T.sky, music: 'parkour', bossMusic: 'parkour', lights: T.lights, quest: null,
  });
  // the planet itself is invisible: everything below the platforms is the void
  const pl = w.addPlanet({ c: V3(0, 0, 0), r: R, atmo: 0x000000, atmoOp: 0, paint: (p, out) => out.setHex(0x0a0610) });
  pl.mesh.visible = false; pl.halo.visible = false;
  if (D.grav) pl.grav = D.grav;   // Zweefrijk: floaty anti-gravity
  w.main = pl;
  w.boss = { g: new THREE.Group(), dead: true, reset() {}, start() {}, update() {} };   // main.js expects one
  addStars(w, 200);
  {   // a dome with glowing gems around it, and a glow deep in the void (like the parkour caves)
    const dome = new THREE.SphereGeometry(48, 48, 32), pos = dome.attributes.position, col = new Float32Array(pos.count * 3), p = V3(), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      p.set(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize();
      const n = fbm(p, 3.2);
      c.setHex(n > 0.8 ? T.dome[3] : n > 0.62 ? T.dome[0] : n > 0.45 ? T.dome[1] : T.dome[2]);
      col.set([c.r, c.g, c.b], i * 3);
    }
    dome.setAttribute('color', new THREE.BufferAttribute(col, 3));
    w.dome = new THREE.Mesh(dome, new THREE.MeshToonMaterial({ vertexColors: true, side: THREE.BackSide })); w.group.add(w.dome);
    w.gems = [];
    for (let i = 0; i < 26; i++) {
      const d = V3(Math.sin(i * 2.4) * Math.cos(i * 0.9), Math.cos(i * 1.7), Math.sin(i * 0.9) * Math.cos(i * 2.4)).normalize();
      const cr = mk(new THREE.OctahedronGeometry(0.9 + (i % 3) * 0.5), basic(T.gems[i % T.gems.length]), 0, 0, 0, w.group, 1.08);
      cr.position.copy(pl.c).addScaledVector(d, 45); cr.scale.y = 2.4; cr.lookAt(pl.c); cr.rotateX(Math.PI / 2); w.gems.push(cr);
    }
    w.group.add(new THREE.Mesh(new THREE.SphereGeometry(5, 24, 16), basic(T.core)));
    const glow = new THREE.Mesh(new THREE.SphereGeometry(10, 24, 16), basic(T.glow, { transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending }));
    w.group.add(glow); w.glow = glow;
    w.updaters.push((dt, t) => glow.scale.setScalar(1 + Math.sin(t * 1.3) * 0.06));
  }

  // ---------- lay out the course along the longitude, then spiral it from the south up to the north ----------
  const spec = [], cps = [], rings = [];
  let lon = 0, h = 5;
  const add = (dl, off, hh, opt = {}, then) => { lon += dl; const s = { lon, off, h: hh, opt, then }; spec.push(s); return s; };
  const coin = (pf) => coinOn(w, pf);
  const startS = add(0, 0, 5, { hx: 2.4, hz: 2.4, top: T.cpTop }); cps.push(startS);
  for (const [type, a, b] of D.route) {
    if (type === 'secret') {   // a golden gear on a platform off to the side: a hard jump (or a dash) away from the path
      const s = add(0, 13, h + 2, { r: 1.1, color: T.alt, top: T.finTop }); s.rare = [a, b];
      continue;
    }
    const n = a || 1;
    for (let k = 0; k < n; k++) {
      const s1 = k % 2 ? -1 : 1;
      if (type === 'hop') { h = Math.max(5, h + (k % 2 ? 0.4 : -0.1)); add(12, 3 * s1, h, {}, coin); }
      if (type === 'bob') add(12, (k % 3 - 1) * 4, h + 0.4, { bob: [0.9, 1.5, k * 1.7], color: T.alt }, coin);
      if (type === 'crumble') add(10, [0, 3, -3][k % 3], h + 0.4, { r: 1.2, crumble: true, color: T.crumble, top: undefined });
      if (type === 'zig') { h += 0.3; add(10, 4 * s1, h, { hx: 0.55, hz: 1.7, yaw: s1 > 0 ? 0.5 : -0.5 }, coin); }
      if (type === 'circle') add(14, 0, h + 0.3, { r: 1.3, circle: k % 2 ? -1.1 : 1.1, color: T.alt });
      if (type === 'down') { h = Math.max(5.5, h - 1.4); add(11, 3 * s1, h, { r: 1.1 }); }
      if (type === 'cp') cps.push(add(13, 0, h, { hx: 2, hz: 2, top: T.cpTop }));
      if (type === 'bounce') {
        add(12, 0, h + 1.1, { r: 1.4, thick: 0.5, bounce: 20, color: T.bounce, top: 0xffffff, puff: T.puff });
        h += 5.5; add(14, 0, h, { r: 1.8 }, (pf) => coinRing(w, pl, pf.n, 1.2, 5, pf.h + 0.9));
      }
      if (type === 'gap') { const g0 = add(12, 0, h + 0.2, { r: 1.3 }); g0.sign = '☄️ X!'; h += 0.4; add(28, 0, h, { r: 1.6 }); }
      // Stuiterstad: trampolines in a row, then a landing a bit higher up
      if (type === 'pads') {
        add(13, k % 2 ? 2.5 : -2.5, h + 0.8, { r: 1.3, thick: 0.5, bounce: 17, color: T.bounce, top: 0xffffff, puff: T.puff });
        if (k === n - 1) { h += 3; add(14, 0, h, { r: 1.8 }, coin); }
      }
      if (type === 'sweep') { const sw = add(14, 0, h, { r: 2.6, color: T.alt }); sw.sweep = k % 2 ? -1.7 : 1.7; }
      // De Wisselbaan: red and blue in turns, and grey ones that slide
      if (type === 'swap') add(11, [0, 2.5, -2.5][k % 3], h + 0.1 * (k % 3), { r: 1.25, swap: k % 2, color: k % 2 ? 0x3a8aff : 0xff3a5a, top: k % 2 ? 0x9fd0ff : 0xffa8b8 });
      if (type === 'slide') add(13, 0, h + 0.2, { hx: 1.1, hz: 1.1, slide: [k * 1.3, k % 2 ? 1.3 : 1.0], color: T.alt });
      // Sterrensprong: a gap too long to jump, with one (or two) dash rings in the middle
      if (type === 'ring') {
        const r0 = add(12, 0, h + 0.2, { r: 1.4 }); r0.sign = '☄️ X!';
        rings.push({ lon: lon + 15, h: h + 1.8 });
        h += 0.3; add(30, 0, h, { r: 1.7 }, coin);
      }
      if (type === 'ring2') {
        const r0 = add(12, 0, h + 0.2, { r: 1.4 }); r0.sign = '☄️ X! X!';
        rings.push({ lon: lon + 15, h: h + 1.8 }, { lon: lon + 31, h: h + 2.0 });
        h += 0.4; add(46, 0, h, { r: 1.8 }, coin);
      }
      // Zweefrijk: an anti-gravity beam that carries you straight up; the next platform floats right beside the top
      if (type === 'lift') {
        const s = add(12, 0, h + 0.2, { r: 1.5, color: T.bounce, top: 0xffffff }); s.lift = 7.5;
        h += 7.5; add(4.2, 0, h, { r: 1.8 }, coin);
      }
    }
  }
  const finS = add(14, 0, h, { hx: 2.4, hz: 2.4, top: T.finTop }); cps.push(finS);
  const total = Math.max(lon, 1);
  const path = coursePath(D.shape, total);
  const along = (l) => { const d = path.at(l), t = path.at(l + 1).sub(path.at(l - 1)); return t.addScaledVector(d, -t.dot(d)).normalize(); };   // the way the route runs here
  const swaps = [];
  for (const s of spec) {
    const dir = path.place(s.lon, s.off), hh = s.h + path.dh(s.lon);
    const base = { dir, h: hh, float: true, thick: 0.7, r: 1.4, color: T.plat, top: T.platTop, ...s.opt };
    delete base.circle; delete base.swap; delete base.slide;
    if (s.opt.circle) { base.dir = path.place(s.lon, s.off + 5); base.orbit = [dir, s.opt.circle]; }
    s.pf = w.addPlatform(pl, base);
    if (s.opt.swap !== undefined) swaps.push(swapper(w, s.pf, s.opt.swap));
    if (s.opt.slide) slider(w, pl, s.pf, along(s.lon), s.opt.slide);
    if (s.sweep) sweeper(w, pl, s.pf, s.sweep);
    if (s.lift) liftBeam(w, pl, s.pf, s.lift);
    if (s.then) s.then(s.pf);
    if (s.sign) sign(w, pl, path.place(s.lon, s.off + 2.4), textBoard(s.sign, 1.8, 0.8, T.signFg, T.signBg), 0.4, hh + 1.6);
    if (s.rare) rareItem(w, ctx, pl, s.pf.n, s.pf.h + 1.2, s.rare[0], s.rare[1]);
  }
  for (const r of rings) dashRing(w, pl, path.at(r.lon), r.h + path.dh(r.lon), along(r.lon));
  if (swaps.length) swapClock(w, pl, swaps);
  const start = startS.pf, fin = finS.pf;
  w.gateAt = { pos: surf(pl, fin.n, fin.h), alt: fin.h };   // for the dev tools
  w.spawn = { dir: start.n.clone(), fwd: path.ahead(0).sub(start.n).normalize() };   // main.js spawns here first; the course then puts you up on the start platform

  // ---------- beacons, hearts, the star gate ----------
  const markers = new Map();
  for (const s of cps) {
    const m = buildBeacon(T.beacon[0], T.beacon[1]); m.scale.multiplyScalar(1.2);
    const holder = new THREE.Group(); holder.add(m); m.position.set(1.5, 0.9, 1.5);
    placeOn(holder, pl, s.pf.n, s.pf.h); w.group.add(holder);
    markers.set(s.pf, m);
    if (s !== startS && s !== finS) w.addPickup(pl, frameDir(s.pf.n, 90 - 2.5, 300), s.pf.h + 0.9, 'heart', { radius: 1.4 });
  }
  const lit = (pf) => { const m = markers.get(pf); if (m) m.traverse((c) => c.isMesh && !c.parent.isMesh && c.geometry.type === 'SphereGeometry' && c.material.color.setHex(0x7dffe0)); };
  const gate = new THREE.Group();
  const gRing = mk(new THREE.TorusGeometry(1.6, 0.18, 10, 32), basic(0xffd23a), 0, 2.0, 0, gate, 1.08);
  const gFill = new THREE.Mesh(new THREE.CircleGeometry(1.45, 32), basic(0x9fe8ff, { transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })); gFill.position.y = 2.0; gate.add(gFill);
  placeOn(gate, pl, fin.n, fin.h); w.group.add(gate);
  w.updaters.push((dt, t) => { gRing.rotation.z += dt; gFill.material.opacity = 0.25 + Math.sin(t * 3) * 0.1; });
  coinRing(w, pl, fin.n, 1.8, 8, fin.h + 0.8);

  // ---------- the host: at the start to explain, and at the star gate to cheer ----------
  const host = w.addNPC(pl, D.model(), frameDir(start.n, 90 - 3.2, 120), { alt: start.h, name: D.host, bubbleY: 1.9, lines: () => D.bubbles, anim: D.hostAnim || ((dt, t, n) => { n.model.r.position.y = Math.abs(Math.sin(t * 3)) * 0.1; }) });
  const host2 = w.addNPC(pl, D.model(), frameDir(fin.n, 90 - 3.2, 120), { alt: fin.h, name: D.host, bubbleY: 1.9, anim: (dt, t, n) => { n.model.arms[0].rotation.z = -2.4 + Math.sin(t * 8) * 0.3; n.model.arms[1].rotation.z = 2.4 - Math.sin(t * 8) * 0.3; } });
  w.winCam = ctx.talkCam(host2);
  w.winLines = D.win;
  w.addInteract({ planet: pl, pos: () => host.g.position, radius: 2.4, prompt: () => `<kbd>E</kbd> talk to ${D.host}`, use: () => { P.talkTo = host; play(D.tips.map(([who, text]) => ({ say: { who, text }, cam: ctx.talkCam(host) })), () => {}); } });

  // ---------- standing on a checkpoint, the void, finishing ----------
  let cp = startS;
  w.falls = 0;
  lit(start);
  const tangentToDir = (from, to) => to.clone().addScaledVector(from, -to.dot(from)).normalize();
  const standOn = (s) => {
    const ahead = path.ahead(s.lon);
    spawnPlayer(pl, s.pf.n, tangentToDir(s.pf.n, ahead));
    P.pos.copy(surf(pl, s.pf.n, s.pf.h + 0.02)); P.alt = P.prevAlt = s.pf.h; P.inv = 1;
    resetCam();
  };
  w.respawn = () => standOn(cp);
  w.hudText = (nl) => {
    const i = cps.indexOf(cp), N = cps.length - 1;
    return `🏁 ${nl ? 'Checkpoint' : 'Checkpoint'} <b>${i} / ${N}</b> &nbsp;· 💥 ${w.falls}${nl ? '× gevallen' : '× fallen'}`;
  };
  w.arrive = () => {
    standOn(startS);
    const over = orbitShot(surf(pl, start.n, 3), start.n, 16, 9, 0.25);
    play([{ dur: 3.2, title: [w.title, w.sub], cam: over }].concat(D.intro.map(([who, text]) => ({ say: { who, text }, cam: who === 'RÊNAS' || who === 'RATJETOE' ? over : ctx.talkCam(host) }))),
      () => { toast('Reach the star gate at the end! Beacons are checkpoints.', 3200); ctx.hud(); });
  };
  let placed = false;
  // NO SHORTCUTS: the planet is small, so later parts of the course hang close to earlier ones. You may skip a
  // couple of platforms (that's good jumping), but landing far ahead of where you've been puts you back.
  const order = new Map(spec.map((s, i) => [s.pf, i]));
  let best = 0, lastOk = startS;
  const SKIP = 4;
  w.updaters.push(() => {
    if (P.planet !== pl) return;
    if (!placed) { placed = true; standOn(cp); return; }   // the world loads you onto the bare (invisible) ground: put you on the start
    if (G.state !== 'play' || G.cutscene || P.dead) return;
    if (P.grounded && order.has(P.ground)) {
      const i = order.get(P.ground);
      if (i > best + SKIP) { sfx.warn(); G.shake = Math.max(G.shake, 0.2); toast('No shortcuts! Follow the course. Back you go.', 2200); standOn(lastOk); return; }
      // (only a still, solid platform counts as a safe place to be put back on)
      if (i >= best) { best = i; const o = spec[i].opt; if (!o.crumble && o.swap === undefined && !o.circle && !o.slide && !o.bob && !spec[i].sweep) lastOk = spec[i]; }
    }
    if (P.grounded && P.ground !== cp.pf) {
      const s = cps.find((c) => c.pf === P.ground);
      if (s && s !== startS && cps.indexOf(s) > cps.indexOf(cp)) { cp = s; lit(s.pf); if (s !== finS) { sfx.quest(); toast('Checkpoint!', 1400); } ctx.hud(); }
    }
    if (P.grounded && P.ground === fin && !w.finished) { w.finished = true; ctx.parkDone(w); return; }
    if (P.alt < 2) {   // every platform is higher than this, so down here is the void
      w.falls++; P.hp--; ctx.hud(); sfx.hurt(); G.shake = Math.max(G.shake, 0.3);
      if (P.hp <= 0) { P.dead = true; if (G.onDie) G.onDie(); return; }
      drawHearts();
      toast('Into the void! Back to the last beacon.', 1800);
      standOn(cp);
    }
  });
  if (D.extra) D.extra(w, pl);   // planet-specific extras (Zweefrijk: gravity waves and the trippy colours)
  return w;
}

// an anti-gravity beam: a see-through column of rising sparkles above a platform. Inside it you float up
function liftBeam(w, pl, pf, height) {
  const holder = new THREE.Group();
  const col = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, height + 2, 20, 1, true), basic(0xc8a8ff, { transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  col.position.y = (height + 2) / 2; holder.add(col);
  const rings = [];
  for (let i = 0; i < 5; i++) { const r = mk(new THREE.TorusGeometry(1.25, 0.06, 6, 24), basic(0xffffff, { transparent: true, opacity: 0.6 }), 0, 0, 0, holder, 0); r.rotation.x = Math.PI / 2; rings.push(r); }
  placeOn(holder, pl, pf.n, pf.h); w.group.add(holder);
  w.updaters.push((dt, t) => {
    rings.forEach((r, i) => { const k = ((t * 0.45 + i / rings.length) % 1); r.position.y = k * (height + 2); r.material.opacity = 0.7 * Math.sin(k * Math.PI); });
    col.material.color.setHSL((t * 0.15) % 1, 0.8, 0.75);
    if (P.planet !== pl || P.dead || G.cutscene) return;
    const flat = Math.acos(clamp(P.up.dot(pf.n), -1, 1)) * (pl.r + pf.h);
    if (flat > 1.35 || P.alt < pf.h - 0.3 || P.alt > pf.h + height + 2.2) return;
    // float up, gently slowing down near the top so you can steer onto the next platform
    const top = P.alt > pf.h + height + 0.6;
    P.vr = top ? Math.min(P.vr + 18 * dt, 3) : Math.min(P.vr + 46 * dt, 8.5);
    P.grounded = false; P.pound = 0;
    if (Math.random() < dt * 20) puff(P.pos.clone(), 1, 0xc8a8ff, 1.5, 0.4, pf.n);
    if (G.toastOnce) G.toastOnce('lift', 'Anti-gravity beam! Float up, then steer onto the platform.');
  });
}

// red/blue platforms: each one belongs to group 0 or 1. The clock decides which group is solid.
function swapper(w, pf, grp) {
  const mats = [];
  pf.mesh.traverse((o) => { if (o.material && !mats.includes(o.material)) { o.material = o.material.clone(); o.material.transparent = true; mats.push(o.material); } });
  return { pf, grp, h0: pf.h, b0: pf.b, mats };
}
function swapClock(w, pl, swaps) {
  const PER = 2.4;
  let tick = -1;
  w.updaters.push((dt, t) => {
    const ph = Math.floor(t / PER) % 2, k = (t % PER) / PER, warn = k > 0.68;
    if (warn && P.planet === pl && !G.cutscene) {
      const tk = Math.floor(t * 4);
      if (tk !== tick) { tick = tk; sfx.blip(k > 0.88 ? 1200 : 820); }
      if (G.toastOnce) G.toastOnce('swap', 'Ticking? The platforms are about to switch colour!');
    }
    for (const s of swaps) {
      const on = s.grp === ph;
      s.pf.h = on ? s.h0 : -99; s.pf.b = on ? s.b0 : -100;
      const op = on ? (warn ? (Math.sin(t * 30) > 0 ? 0.95 : 0.35) : 0.95) : 0.12;
      for (const m of s.mats) m.opacity = op;
    }
  });
}
// a platform that slides back and forth across the path (and carries you along)
function slider(w, pl, pf, axis, [ph, spd]) {
  const n0 = pf.n.clone(), g = pf.mesh, q0 = g.quaternion.clone();
  pf.dq = new THREE.Quaternion(); pf.slack = 0.6;
  w.updaters.push((dt, t) => {
    const qa = new THREE.Quaternion().setFromAxisAngle(axis, Math.sin(t * spd + ph) * 0.16);
    const prev = pf.n.clone();
    pf.n.copy(n0).applyQuaternion(qa);
    pf.dq.setFromUnitVectors(prev, pf.n);
    g.quaternion.copy(qa).multiply(q0);
    g.position.copy(pl.c).addScaledVector(pf.n, pl.r);
    if (pf.shape === 'box') { pf.e1.set(1, 0, 0).applyQuaternion(g.quaternion); pf.e2.set(0, 0, 1).applyQuaternion(g.quaternion); }
  });
  pf.carry = (PL) => {
    const rel = PL.pos.clone().sub(pl.c).applyQuaternion(pf.dq);
    PL.pos.copy(pl.c).add(rel); PL.fwd.applyQuaternion(pf.dq); PL.vt.applyQuaternion(pf.dq);
  };
}
// a striped bar that spins round a post on a big round platform: jump over it
function sweeper(w, pl, pf, spd) {
  const holder = new THREE.Group(), spin = new THREE.Group(); holder.add(spin);
  mk(new THREE.CylinderGeometry(0.25, 0.3, 1.0, 10), toon(0x3a2440), 0, 0.5, 0, holder, 1.08);
  const L = pf.r * 2 + 0.2;
  for (let i = 0; i < 6; i++) mk(new THREE.BoxGeometry(L / 6, 0.28, 0.28), toon(i % 2 ? 0xffffff : 0xff3a5a), -L / 2 + L / 12 + (i * L) / 6, 0.45, 0, spin, 1.08);
  placeOn(holder, pl, pf.n, pf.h); w.group.add(holder);
  const q = new THREE.Quaternion(), bd = V3();
  w.updaters.push((dt) => {
    spin.rotation.y += spd * dt;
    if (P.planet !== pl || P.dead || P.inv > 0 || G.cutscene) return;
    const dist = Math.acos(clamp(P.up.dot(pf.n), -1, 1)) * (pl.r + pf.h);
    if (dist < 0.7 || dist > pf.r + 0.3 || P.alt > pf.h + 0.75 || P.alt < pf.h - 0.6) return;
    bd.set(1, 0, 0).applyQuaternion(spin.getWorldQuaternion(q)); bd.addScaledVector(pf.n, -bd.dot(pf.n)).normalize();
    const v = P.up.clone().addScaledVector(pf.n, -P.up.dot(pf.n)).normalize();
    const perp = dist * Math.sqrt(Math.max(0, 1 - v.dot(bd) ** 2));
    if (perp < 0.55) { hurtPlayer(surf(pl, pf.n, pf.h), 4); if (G.toastOnce) G.toastOnce('sweep', 'Spinning bar! Jump over it.'); }
  });
  if (G.toastOnce) w.updaters.push(() => { if (P.planet === pl && P.ground === pf) G.toastOnce('sweep', 'Spinning bar! Jump over it.'); });
}
// a glowing ring in mid-air: fly through it and the Komeetduik is back, with a little lift
function dashRing(w, pl, dir, alt, fwd) {
  const holder = new THREE.Group();
  const ring = mk(new THREE.TorusGeometry(1.15, 0.12, 10, 28), basic(0x5ef2e0), 0, 0, 0, holder, 1.1);
  const fill = new THREE.Mesh(new THREE.CircleGeometry(1.0, 24), basic(0x5ef2e0, { transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })); holder.add(fill);
  holder.position.copy(surf(pl, dir, alt)); orientOn(holder, dir, fwd); w.group.add(holder);
  let cd = 0;
  w.updaters.push((dt, t) => {
    cd -= dt; ring.rotation.z += dt * 2;
    const s = cd > 0 ? 1.3 - cd * 0.3 : 1 + Math.sin(t * 4) * 0.05; holder.scale.setScalar(s);
    ring.material.color.setHex(cd > 0 ? 0xffffff : 0x5ef2e0);
    if (P.planet !== pl || P.dead || cd > 0) return;
    if (P.pos.distanceTo(holder.position) < 1.7) {
      cd = 1.0; P.dashAir = false; P.dashCd = 0; P.dashT = 0; P.vr = Math.max(P.vr, 7);
      sfx.jump(3); puff(holder.position.clone(), 16, 0x5ef2e0, 4, 0.5, dir);
      if (G.toastOnce) G.toastOnce('ring', '☄️ Komeetduik back! Press X again!');
    }
  });
}
